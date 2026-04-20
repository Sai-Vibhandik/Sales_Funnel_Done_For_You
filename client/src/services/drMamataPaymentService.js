const BASE_URL = "https://testingdrmamatajain.valleyhoster.com/api";

// ✅ CREATE PAYMENT (create order)
export const createPaymentT3 = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/createPayment_t3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Create Payment Error:", error);
    return { success: false, message: "Create payment failed" };
  }
};

// ✅ VERIFY PAYMENT
export const verifyPaymentT3 = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/verifyPayment_t3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return { success: false, message: "Verification failed" };
  }
};

// ✅ APPLY COUPON
export const applyCoupon = async (payload) => {
  try {
    const res = await fetch(`${BASE_URL}/applyCoupon`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Coupon Error:", error);
    return { success: false, message: "Coupon failed" };
  }
};