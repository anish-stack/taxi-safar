const axios = require("axios");
require("dotenv").config();

const sendDltMessage = async (phone, otp) => {
  try {
    if (!phone) {
      throw new Error("Please provide a valid mobile number");
    }

    // Remove +91 if present
    phone = phone.toString().trim();
    if (phone.startsWith("+91")) {
      phone = phone.slice(3);
    }

    // Validate mobile number
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(phone)) {
      throw new Error("Invalid Indian mobile number");
    }

    // Validate OTP
    otp = otp.toString().trim();
    if (!otp || otp.length !== 6 || isNaN(otp)) {
      throw new Error("Please provide a valid 4-digit numeric OTP");
    }

  
    const url = `${process.env.DLT_URL}`;
    const params = {
      authorization: process.env.DLT_TOKEN ,
      route: "dlt",
      sender_id: "TAXISF",
      message: "181787", 
      variables_values: `${otp}|`, 
      numbers: phone,
      flash: "0",
      schedule_time: "",
    };

   
    const response = await axios.get(url, { params });

    console.log("Fast2SMS Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = sendDltMessage;
