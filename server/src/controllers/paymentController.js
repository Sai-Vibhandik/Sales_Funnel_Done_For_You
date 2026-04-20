const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Payment = require("../models/Payment");
const Plan = require("../models/Plan");
const User = require("../models/User");
const Membership = require("../models/Membership");
const emailService = require("../services/emailService");

/**
 * Complete payment and create organization
 *
 * This endpoint is called after Razorpay payment verification
 * to store the payment info in local database and create the organization
 */
const completePayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      selectedPlan,
      organizationData,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    console.log("📦 Complete payment request:", {
      userId,
      selectedPlan: selectedPlan?._id || selectedPlan?.id,
      organizationData,
      razorpay_order_id,
      razorpay_payment_id,
    });

    // Validate required fields
    if (!organizationData?.name) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    if (!selectedPlan?._id && !selectedPlan?.id) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    // Find the plan
    const planId = selectedPlan._id || selectedPlan.id;
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Determine user (from auth or from userId parameter)
    let user = null;
    if (req.user?._id) {
      user = req.user;
    } else if (userId) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User ID is required. Please log in first.",
      });
    }

    // Generate unique slug
    const baseSlug = organizationData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);
    const timestamp = Date.now().toString(36);
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const slug = `${baseSlug}-${timestamp}-${randomSuffix}`;

    // Calculate price
    const price = selectedPlan.price ||
      (selectedPlan.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) ||
      plan.monthlyPrice || 0;

    // Get plan limits and features
    const planLimits = plan.limits || {
      maxUsers: 3,
      maxProjects: 3,
      maxLandingPages: 5,
      maxLandingPagesPerProject: 5,
      storageLimitMB: 1024,
      aiCallsPerMonth: 50,
      customDomains: 0,
    };
    const planFeatures = plan.features || {};

    // Calculate subscription period
    const billingCycle = selectedPlan.billingCycle || 'monthly';
    const periodStart = new Date();
    const periodEnd = billingCycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // ✅ 1. CREATE ORGANIZATION
    const [org] = await Organization.create([{
      name: organizationData.name,
      slug: slug,
      description: organizationData.description || '',
      owner: user._id,
      plan: plan._id,
      planName: plan.name,
      planLimits: planLimits,
      features: planFeatures,
      subscriptionStatus: 'active',
      subscriptionProvider: 'razorpay',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      createdBy: user._id,
    }], { session });

    console.log("✅ Organization created:", org._id);

    // ✅ 2. CREATE PAYMENT RECORD
    const [payment] = await Payment.create([{
      userId: user._id,
      organizationId: org._id,
      planId: plan._id,
      planName: plan.name,
      billingCycle: billingCycle,
      amount: price,
      currency: 'INR',
      status: 'success',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }], { session });

    console.log("✅ Payment record created:", payment._id);

    // ✅ 3. UPDATE ORGANIZATION WITH PAYMENT REFERENCE
    await Organization.findByIdAndUpdate(
      org._id,
      { latestPaymentId: payment._id },
      { session }
    );

    // ✅ 4. CREATE MEMBERSHIP (user joins the organization)
    await Membership.create([{
      userId: user._id,
      organizationId: org._id,
      status: 'active',
      joinedAt: new Date(),
      invitedBy: user._id, // Self-invited (owner)
    }], { session });

    // ✅ 5. UPDATE USER - set role to admin and current organization
    await User.findByIdAndUpdate(
      user._id,
      {
        role: 'admin',
        currentOrganization: org._id,
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log("✅ Payment complete:", { org: org._id, payment: payment._id });

    // Send email notification (async, don't block)
    console.log('=== Sending organization registration email ===');
    console.log('Org:', org.name);
    console.log('Owner:', user.name, user.email);
    console.log('Plan:', plan.name);

    emailService.sendOrgRegistrationNotification(org, user, plan)
      .catch(err => console.error('Failed to send org registration notification:', err));

    res.json({
      success: true,
      message: "Payment recorded and organization created successfully",
      data: {
        organization: org,
        payment: payment,
      },
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ COMPLETE PAYMENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to complete payment",
    });
  }
};

/**
 * Get payment history for an organization
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { organizationId } = req;

    const payments = await Payment.find({ organizationId })
      .sort({ createdAt: -1 })
      .populate('planId', 'name tier monthlyPrice yearlyPrice');

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("❌ Get payment history error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payment history",
    });
  }
};

module.exports = {
  completePayment,
  getPaymentHistory,
};