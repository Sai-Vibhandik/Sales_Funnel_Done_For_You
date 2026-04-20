const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  // User who made the payment
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Organization the payment is for
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },

  // Plan details
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
  },
  planName: {
    type: String,
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },

  // Payment amount
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "INR",
  },

  // Payment status
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
    index: true,
  },

  // Razorpay details
  razorpay_order_id: {
    type: String,
    index: true,
  },
  razorpay_payment_id: {
    type: String,
    index: true,
  },
  razorpay_signature: {
    type: String,
  },

  // Stripe details (for future use)
  stripe_payment_intent_id: {
    type: String,
  },
  stripe_customer_id: {
    type: String,
  },

  // Refund details
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundReason: {
    type: String,
  },
  refundedAt: {
    type: Date,
  },

  // Invoice details
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  invoiceUrl: {
    type: String,
  },

  // Notes
  notes: {
    type: String,
  },

}, {
  timestamps: true,
});

// Indexes for common queries
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ organizationId: 1, status: 1 });
paymentSchema.index({ userId: 1, status: 1 });

// Generate invoice number before saving
paymentSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const prefix = `INV-${year}${month}-`;

      // Find the highest invoice number for this month
      const lastPayment = await this.constructor.findOne({
        invoiceNumber: { $regex: `^${prefix}` }
      }).sort({ invoiceNumber: -1 }).select('invoiceNumber');

      let nextNumber = 1;
      if (lastPayment && lastPayment.invoiceNumber) {
        // Extract the number from the last invoice and increment
        const lastNumber = parseInt(lastPayment.invoiceNumber.split('-')[2], 10);
        nextNumber = lastNumber + 1;
      }

      this.invoiceNumber = `${prefix}${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      // If there's still a duplicate, try with a timestamp-based suffix
      const timestamp = Date.now().toString().slice(-6);
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      this.invoiceNumber = `INV-${year}${month}-${timestamp}`;
    }
  }
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);