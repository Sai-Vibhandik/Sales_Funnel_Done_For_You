import React, { useState, useEffect } from "react";
import {
  createPaymentT3,
  verifyPaymentT3,
  applyCoupon,
} from "../services/drMamataPaymentService";
    import { useLocation } from "react-router-dom";

const Checkout = () => {

const location = useLocation();

const [organizationData, setOrganizationData] = useState(null);
const [selectedPlan, setSelectedPlan] = useState(null);

useEffect(() => {
  // 1. Try getting from navigate state
  if (location.state?.organizationData && location.state?.selectedPlan) {
    setOrganizationData(location.state.organizationData);
    setSelectedPlan(location.state.selectedPlan);
    return;
  }

  // 2. Fallback to sessionStorage
  const stored = sessionStorage.getItem("checkoutData");
  if (stored) {
    const parsed = JSON.parse(stored);
    setOrganizationData(parsed.organizationData);
    setSelectedPlan(parsed.selectedPlan);
  }
}, []);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const productDetails = {
    name: "Book Bundle",
    price: 500, // ₹500
  };

  const finalAmount =
    productDetails.price - (productDetails.price * discountPercent) / 100;

  // ✅ HANDLE INPUT
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ LOAD RAZORPAY SCRIPT
  const loadScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // ✅ APPLY COUPON
  const handleApplyCoupon = async () => {
    if (!coupon) return alert("Enter coupon");

    const res = await applyCoupon({
      coupon_code: coupon,
      email: formData.email,
      mobile: formData.phone,
    });

    if (res.success) {
      setDiscountPercent(res.discount || 10);
      alert("Coupon applied!");
    } else {
      alert("Invalid coupon");
    }
  };

  // ✅ MAIN PAYMENT FUNCTION
  const handlePayment = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      return alert("Please fill required fields");
    }

    setIsProcessing(true);

    const scriptLoaded = await loadScript();
    if (!scriptLoaded) {
      alert("Razorpay SDK failed to load");
      setIsProcessing(false);
      return;
    }

    try {
      // 🔥 STEP 1: CREATE ORDER
      const data = await createPaymentT3({
        name: formData.name,
        mobile: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
        book_name: productDetails.name,
        book_amount: finalAmount.toString(),
        coupon_code: discountPercent ? coupon : null,
      });

      if (!data.success) {
        throw new Error("Payment init failed");
      }

      // 🔥 STEP 2: RAZORPAY OPTIONS
      const options = {
        key: data.key,
        amount: data.amount, // already in paise
        currency: data.currency || "INR",
        name: "Dr Mamata Jain",
        description: "Purchase",
        order_id: data.order_id,

        handler: async function (response) {
          try {
            // 🔥 STEP 3: VERIFY PAYMENT
            const verifyData = await verifyPaymentT3({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              gateway: "razorpay",
            });

            if (!verifyData.success) {
              throw new Error("Verification failed");
            }

            // 🔥 SUCCESS REDIRECT
            window.location.href = "/success";
          } catch (err) {
            alert("Payment verification failed");
          }
        },

        modal: {
          ondismiss: function () {
            alert("Payment cancelled");
          },
        },

        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },

        theme: {
          color: "#3399cc",
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        alert("Payment Failed ❌");
        console.error(response.error);
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px" }}>
      <h2>Checkout</h2>

      {/* FORM */}
      <input name="name" placeholder="Name" onChange={handleChange} />
      <input name="email" placeholder="Email" onChange={handleChange} />
      <input name="phone" placeholder="Phone" onChange={handleChange} />
      <input name="address" placeholder="Address" onChange={handleChange} />
      <input name="city" placeholder="City" onChange={handleChange} />
      <input name="state" placeholder="State" onChange={handleChange} />
      <input name="pincode" placeholder="Pincode" onChange={handleChange} />

      {/* COUPON */}
      <div style={{ marginTop: "10px" }}>
        <input
          placeholder="Coupon Code"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
        />
        <button onClick={handleApplyCoupon}>Apply</button>
      </div>

      {/* PRICE */}
      <h3>Price: ₹{productDetails.price}</h3>
      {discountPercent > 0 && (
        <h4>Discount: {discountPercent}%</h4>
      )}
      <h2>Total: ₹{finalAmount}</h2>

      {/* PAY BUTTON */}
      <button onClick={handlePayment} disabled={isProcessing}>
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </div>
  );
};

export default Checkout;