const ComopanyDetails = require("../../models/driver/ComopanyDetails");
const Driver = require("../../models/driver/driver.model");
const Quotations = require("../../models/extra/Quatations");
const { deleteImage, uploadSingleImage } = require("../../utils/cloudinary");
const puppeteer = require("puppeteer");

// Browser instance management
let browser = null;

const getBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-web-security",
      ],
    });
  }
  return browser;
};

const generatePDF = async (html) => {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "10mm",
      right: "10mm",
      bottom: "10mm",
      left: "10mm",
    },
  });

  await page.close();
  return pdfBuffer;
};

// Helper function to convert number to words
const numberToWords = (num) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  if (num === 0) return "Zero";

  const convertLessThanThousand = (n) => {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
      );
    return (
      ones[Math.floor(n / 100)] +
      " Hundred" +
      (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
    );
  };

  if (num < 1000) return convertLessThanThousand(num);
  if (num < 100000) {
    return (
      convertLessThanThousand(Math.floor(num / 1000)) +
      " Thousand" +
      (num % 1000 !== 0 ? " " + convertLessThanThousand(num % 1000) : "")
    );
  }
  if (num < 10000000) {
    return (
      convertLessThanThousand(Math.floor(num / 100000)) +
      " Lakh" +
      (num % 100000 !== 0 ? " " + numberToWords(num % 100000) : "")
    );
  }
  return (
    convertLessThanThousand(Math.floor(num / 10000000)) +
    " Crore" +
    (num % 10000000 !== 0 ? " " + numberToWords(num % 10000000) : "")
  );
};

// Generate Invoice Number
const generateInvoiceNumber = async () => {
  const count = await Quotations.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `INV-${year}${month}-${String(count + 1).padStart(5, "0")}`;
};

// HTML Template for PDF
const generateHTMLTemplate = (quotation, company) => {
  // Check if any trip has TotalAmountOftrip (simplified mode)
  const isSimplifiedMode = quotation.trip_details.some(
    (trip) => trip.TotalAmountOftrip && trip.TotalAmountOftrip > 0
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Estimate Quotation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      font-size: 12px;
      color: #000;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    
    .company-info h1 {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .company-info p {
      font-size: 11px;
      margin: 2px 0;
    }
    
    .company-logo {
      width: 60px;
      height: 60px;
    }
    
    .divider {
      border-top: 2px solid #ff1744;
      margin: 15px 0;
    }
    
    .invoice-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #ff1744;
      margin: 20px 0;
    }
    
    .invoice-details-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    
    .bill-to h3, .invoice-info h3 {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .bill-to p, .invoice-info p {
      font-size: 11px;
      margin: 3px 0;
    }
    
    .invoice-info {
      text-align: right;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    table thead {
      background-color: #ff1744;
      color: white;
    }
    
    table th, table td {
      padding: 10px 8px;
      text-align: left;
      font-size: 11px;
      border: 1px solid #ddd;
    }
    
    table th {
      font-weight: bold;
    }
    
    table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .total-row {
      background-color: #f5f5f5 !important;
      font-weight: bold;
    }
    
    .summary-section {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .terms {
      width: 48%;
    }
    
    .terms h4 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .terms p {
      font-size: 11px;
    }
    
    .amount-breakdown {
      width: 48%;
    }
    
    .amount-breakdown table {
      margin: 0;
    }
    
    .amount-breakdown td {
      padding: 6px 8px;
      border: 1px solid #ddd;
    }
    
    .amount-breakdown .grand-total {
      background-color: #ff1744;
      color: white;
      font-weight: bold;
      font-size: 13px;
    }
    
    .footer-section {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    
    .bank-details h4, .signature h4 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .bank-details p {
      font-size: 11px;
      margin: 3px 0;
    }
    
    .signature {
      text-align: right;
    }
    
    .signature img {
      width: 120px;
      margin-bottom: 5px;
    }
    
    .signature p {
      font-size: 11px;
      font-weight: bold;
    }
    
    .extra-charges {
      font-size: 10px;
      color: #666;
      margin-top: 3px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${company.company_name}</h1>
      <p>${company.address}</p>
      <p>Phone no.: ${company.phone}</p>
      <p>Email: ${company.email}</p>
    </div>
    ${
      company.logo?.url
        ? `<img src="${company.logo.url}" alt="Logo" class="company-logo">`
        : ""
    }
  </div>
  
  <div class="divider"></div>
  
  <div class="invoice-title">Your Estimate Quotation</div>
  
  <div class="invoice-details-section">
    <div class="bill-to">
      <h3>Bill To</h3>
      <p><strong>${quotation.bill_to.customer_name}</strong></p>
      <p>Contact No.: ${quotation.bill_to.contact_number}</p>
    </div>
    
    <div class="invoice-info">
      <h3>Invoice Details</h3>
      <p>Invoice No.: ${quotation.invoice_number}</p>
      <p>Date: ${new Date(quotation.invoice_date).toLocaleDateString(
        "en-IN"
      )}</p>
      <p>Trip Type: ${
        quotation.trip_type === "one_way" ? "One Way" : "Round Trip"
      }</p>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>S.N</th>
        <th>Pickup & Drop Place</th>
        <th>Vehicle Type</th>
        <th>Pickup Date & Time</th>
        ${
          quotation.trip_type === "round_trip"
            ? "<th>Return Date & Time</th>"
            : ""
        }
        ${!isSimplifiedMode ? "<th>Total Days</th>" : ""}
        ${!isSimplifiedMode ? "<th>Per Day Charges</th>" : ""}
        ${!isSimplifiedMode ? "<th>Toll Tax</th>" : ""}
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${quotation.trip_details
        .map((trip, index) => {
          const extraChargesHTML =
            trip.extra_charges && trip.extra_charges.length > 0
              ? `<div class="extra-charges">${trip.extra_charges
                  .map((ec) => `${ec.description}: ₹${ec.amount.toFixed(2)}`)
                  .join(", ")}</div>`
              : "";

          return `
        <tr>
          <td>${index + 1}</td>
          <td>${trip.pickup_drop_place}</td>
          <td>${trip.vehicle_type}</td>
          <td>${new Date(trip.pickup_date).toLocaleDateString("en-IN")} ${
            trip.pickup_time
          }</td>
          ${
            quotation.trip_type === "round_trip"
              ? `<td>${new Date(trip.return_date).toLocaleDateString(
                  "en-IN"
                )} ${trip.return_time}</td>`
              : ""
          }
          ${!isSimplifiedMode ? `<td>${trip.total_days || "-"}</td>` : ""}
          ${
            !isSimplifiedMode
              ? `<td>₹ ${
                  trip.per_day_cab_charges
                    ? trip.per_day_cab_charges.toFixed(2)
                    : "-"
                }</td>`
              : ""
          }
          ${
            !isSimplifiedMode
              ? `<td>₹ ${trip.toll_tax_amount.toFixed(2)}</td>`
              : ""
          }
          <td>
            ₹ ${trip.total_amount.toFixed(2)}
            ${extraChargesHTML}
          </td>
        </tr>
      `;
        })
        .join("")}
      <tr class="total-row">
        <td colspan="${
          isSimplifiedMode
            ? quotation.trip_type === "round_trip"
              ? "5"
              : "4"
            : quotation.trip_type === "round_trip"
            ? "8"
            : "7"
        }" style="text-align: right;"><strong>Total</strong></td>
        ${
          !isSimplifiedMode
            ? `<td>₹ ${quotation.summary.toll_tax_total.toFixed(2)}</td>`
            : ""
        }
        <td>₹ ${quotation.summary.sub_total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="summary-section">
    <div class="terms">
      <h4>Invoice Amount In Words</h4>
      <p>${quotation.summary.amount_in_words}</p>
      <br>
      <h4>Terms And Conditions</h4>
      <p>${quotation.terms_and_conditions}</p>
    </div>
    
    <div class="amount-breakdown">
      <table>
        <tr>
          <td>Sub Total</td>
          <td style="text-align: right;">₹ ${quotation.summary.sub_total.toFixed(
            2
          )}</td>
        </tr>
        ${
          !isSimplifiedMode
            ? `
        <tr>
          <td>Toll Tax</td>
          <td style="text-align: right;">₹ ${quotation.summary.toll_tax_total.toFixed(
            2
          )}</td>
        </tr>
        <tr>
          <td>State Tax</td>
          <td style="text-align: right;">₹ ${quotation.summary.state_tax.toFixed(
            2
          )}</td>
        </tr>
        <tr>
          <td>Driver Charge</td>
          <td style="text-align: right;">₹ ${quotation.summary.driver_charge.toFixed(
            2
          )}</td>
        </tr>
        <tr>
          <td>Parking Charge</td>
          <td style="text-align: right;">₹ ${quotation.summary.parking_charge.toFixed(
            2
          )}</td>
        </tr>
        `
            : ""
        }
        ${
          quotation.summary.extra_charges_total > 0
            ? `
        <tr>
          <td>Extra Charges</td>
          <td style="text-align: right;">₹ ${quotation.summary.extra_charges_total.toFixed(
            2
          )}</td>
        </tr>
        `
            : ""
        }
        <tr class="grand-total">
          <td><strong>Total</strong></td>
          <td style="text-align: right;"><strong>₹ ${quotation.summary.grand_total.toFixed(
            2
          )}</strong></td>
        </tr>
        <tr>
          <td>Payment Mode</td>
          <td style="text-align: right;">${
            quotation.payment_mode.charAt(0).toUpperCase() +
            quotation.payment_mode.slice(1).replace("_", " ")
          }</td>
        </tr>
      </table>
    </div>
  </div>
  
  <div class="footer-section">
    <div class="bank-details">
      <h4>Pay To:</h4>
      <p>Bank Name: ${quotation.bank_details.bank_name}</p>
      <p>Bank Account No.: ${quotation.bank_details.account_number}</p>
      <p>Bank IFSC code: ${quotation.bank_details.ifsc_code}</p>
      <p>Account Holder's Name: ${
        quotation.bank_details.account_holder_name
      }</p>
    </div>
    
    <div class="signature">
      <p>For: ${company.company_name}</p>
      <br>
      ${
        company.signature?.url
          ? `<img src="${company.signature.url}" alt="Signature">`
          : "<br><br>"
      }
      <p>Authorized Signatory</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Create Quotation
exports.createQuotation = async (req, res) => {
  try {
    const driverId = req.user.id;

    // Find company details
    const company = await ComopanyDetails.findOne({ driver: driverId });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company details not found. Please add company details first.",
      });
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate totals
    let subTotal = 0;
    let tollTaxTotal = 0;
    let extraChargesTotal = 0;

    const tripDetails = req.body.trip_details.map((trip, index) => {
      let tripTotal = 0;

      // Check if TotalAmountOftrip is provided (simplified mode)
      if (trip.TotalAmountOftrip && trip.TotalAmountOftrip > 0) {
        tripTotal = trip.TotalAmountOftrip;
      } else {
        // Detailed calculation mode
        tripTotal = (trip.per_day_cab_charges || 0) * (trip.total_days || 1);
        tollTaxTotal += trip.toll_tax_amount || 0;
      }

      // Add extra charges to trip total
      if (trip.extra_charges && trip.extra_charges.length > 0) {
        const tripExtraCharges = trip.extra_charges.reduce(
          (sum, charge) => sum + (charge.amount || 0),
          0
        );
        tripTotal += tripExtraCharges;
        extraChargesTotal += tripExtraCharges;
      }

      subTotal += tripTotal;

      return {
        sn: index + 1,
        pickup_drop_place: trip.pickup_drop_place,
        vehicle_type: trip.vehicle_type,
        pickup_date: trip.pickup_date,
        pickup_time: trip.pickup_time,
        return_date: trip.return_date || null,
        return_time: trip.return_time || null,
        TotalAmountOftrip: trip.TotalAmountOftrip || null,
        total_days: trip.total_days || null,
        per_day_cab_charges: trip.per_day_cab_charges || null,
        toll_tax_amount: trip.toll_tax_amount || 0,
        extra_charges: trip.extra_charges || [],
        total_amount: tripTotal,
      };
    });

    const stateTax = req.body.summary?.state_tax || 0;
    const driverCharge = req.body.summary?.driver_charge || 0;
    const parkingCharge = req.body.summary?.parking_charge || 0;

    const grandTotal =
      subTotal + tollTaxTotal + stateTax + driverCharge + parkingCharge;
    const amountInWords =
      numberToWords(Math.floor(grandTotal)) + " Rupees Only";

    // Create quotation object
    const quotationData = {
      driver: driverId,
      company_id: company._id,
      invoice_number: invoiceNumber,
      invoice_date: req.body.invoice_date || new Date(),
      bill_to: req.body.bill_to,
      trip_type: req.body.trip_type || "one_way",
      trip_details: tripDetails,
      summary: {
        sub_total: subTotal,
        toll_tax_total: tollTaxTotal,
        state_tax: stateTax,
        driver_charge: driverCharge,
        parking_charge: parkingCharge,
        extra_charges_total: extraChargesTotal,
        grand_total: grandTotal,
        amount_in_words: amountInWords,
      },
      payment_mode: req.body.payment_mode || "bank_transfer",
      bank_details: req.body.bank_details,
      terms_and_conditions:
        req.body.terms_and_conditions ||
        "Thank you for doing business with us.",
    };

    // Save quotation
    const quotation = await Quotations.create(quotationData);

    // Generate PDF
    const html = generateHTMLTemplate(quotation, company);
    const pdfBuffer = await generatePDF(html);
    const pdfBufferSend = Buffer.from(pdfBuffer);

    // Upload to Cloudinary
    const pdfUpload = await uploadSingleImage(pdfBufferSend, "quotations/pdf");

    // Save PDF URL
    quotation.pdf = {
      url: pdfUpload.image,
      public_id: pdfUpload.public_id,
    };
    await quotation.save();

    res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create quotation",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get All Quotations
exports.getAllQuotations = async (req, res) => {
  try {
    const driverId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const quotations = await Quotations.find({ driver: driverId })
      .populate("company_id", "company_name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quotations.countDocuments({ driver: driverId });

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quotations",
    });
  }
};

// Get Quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const driverId = req.user.id;
    const quotationId = req.params.id;

    const quotation = await Quotations.findOne({
      _id: quotationId,
      driver: driverId,
    }).populate("company_id");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch quotation",
    });
  }
};

// Update Quotation
exports.updateQuotation = async (req, res) => {
  try {
    const driverId = req.user.id;
    const quotationId = req.params.id;


    // Ensure Puppeteer is initialized
    if (!htmlPDF.browser) {
      await htmlPDF.initializeBrowser();
    }

    const quotation = await Quotations.findOne({
      _id: quotationId,
      driver: driverId,
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const company = await ComopanyDetails.findOne({ driver: driverId });

    // Recalculate if trip details changed
    if (req.body.trip_details) {
      let subTotal = 0;
      let tollTaxTotal = 0;

      const tripDetails = req.body.trip_details.map((trip, index) => {
        const tripTotal = trip.per_day_cab_charges * trip.total_days;
        subTotal += tripTotal;
        tollTaxTotal += trip.toll_tax_amount || 0;

        return {
          sn: index + 1,
          pickup_drop_place: trip.pickup_drop_place,
          vehicle_type: trip.vehicle_type,
          pickup_date: trip.pickup_date,
          drop_date: trip.drop_date,
          drop_time: trip.drop_time,
          total_days: trip.total_days,
          per_day_cab_charges: trip.per_day_cab_charges,
          toll_tax_amount: trip.toll_tax_amount || 0,
          total_amount: tripTotal,
        };
      });

      const stateTax =
        req.body.summary?.state_tax || quotation.summary.state_tax;
      const driverCharge =
        req.body.summary?.driver_charge || quotation.summary.driver_charge;
      const parkingCharge =
        req.body.summary?.parking_charge || quotation.summary.parking_charge;

      const grandTotal =
        subTotal + tollTaxTotal + stateTax + driverCharge + parkingCharge;
      const amountInWords =
        numberToWords(Math.floor(grandTotal)) + " Rupees only";

      req.body.summary = {
        sub_total: subTotal,
        toll_tax_total: tollTaxTotal,
        state_tax: stateTax,
        driver_charge: driverCharge,
        parking_charge: parkingCharge,
        grand_total: grandTotal,
        amount_in_words: amountInWords,
      };

      req.body.trip_details = tripDetails;
    }

    // Update quotation
    Object.assign(quotation, req.body);
    await quotation.save();

    // Regenerate PDF
    if (quotation.pdf.public_id) {
      await deleteImage(quotation.pdf.public_id);
    }

    const html = generateHTMLTemplate(quotation, company);

    const pdfBuffer = await generatePDF(html);
    const pdfBufferSend = Buffer.from(pdfBuffer);
    // Upload to Cloudinary
    const pdfUpload = await uploadSingleImage(pdfBufferSend, "quotations/pdf");

    quotation.pdf.url = pdfUpload.image;
    quotation.pdf.public_id = pdfUpload.public_id;
    await quotation.save();

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update quotation",
    });
  }
};

// Delete Quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const driverId = req.user.id;
    const quotationId = req.params.id;

    const quotation = await Quotations.findOne({
      _id: quotationId,
      driver: driverId,
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Delete PDF from Cloudinary
    if (quotation.pdf.public_id) {
      await deleteImage(quotation.pdf.public_id);
    }

    await Quotations.deleteOne({ _id: quotationId });

    res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete quotation",
    });
  }
};

// Regenerate PDF
exports.regeneratePDF = async (req, res) => {
  try {
    const driverId = req.user.id;
    const quotationId = req.params.id;

    // Ensure Puppeteer is initialized
    if (!htmlPDF.browser) {
      await htmlPDF.init();
    }

    const quotation = await Quotations.findOne({
      _id: quotationId,
      driver: driverId,
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const company = await ComopanyDetails.findOne({ driver: driverId });

    // Delete old PDF
    if (quotation.pdf.public_id) {
      await deleteImage(quotation.pdf.public_id);
    }

    // Generate new PDF
    const html = generateHTMLTemplate(quotation, company);
    const pdfBuffer = await htmlPDF.create(html, {
      format: "A4",
      printBackground: true,
    });

    const pdfUpload = await uploadSingleImage(pdfBuffer, "quotations");
    quotation.pdf.url = pdfUpload.image;
    quotation.pdf.public_id = pdfUpload.public_id;
    await quotation.save();

    res.status(200).json({
      success: true,
      message: "PDF regenerated successfully",
      pdf_url: quotation.pdf.url,
    });
  } catch (error) {
    console.error("Error regenerating PDF:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to regenerate PDF",
    });
  }
};
