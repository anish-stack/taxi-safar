const ComopanyDetails = require("../../models/driver/ComopanyDetails");
const Driver = require("../../models/driver/driver.model");
const Quotations = require("../../models/extra/Quatations");
const BankDetails = require("../../models/driver/bankDetails.model");
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
  const day = String(date.getDate()).padStart(2, "0");
  return `VFPL${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
};

const generateInvoiceNewNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  let txns;
  let exists = true;

  while (exists) {
    const count = await Quotations.countDocuments({
      invoice_number: new RegExp(`^TAXIN${year}${month}${day}`),
    });

    txns = `TAXIN${year}${month}${day}${String(count + 1).padStart(4, "0")}`;

    exists = await Quotations.exists({ invoice_number: txns });
  }

  return txns;
};

const generateHTMLTemplate = (
  quotation,
  company,
  documentType = "quotation"
) => {
  const isInvoice = documentType === "invoice";
  const title = isInvoice ? "TAX INVOICE" : "Your Estimate Quotation";

  const billTo = quotation.bill_to || {};
  const summary = quotation.summary || {};
  const trip = quotation.trip_details?.[0] || {};

  const isDayWise = trip.pricing_mode === "day_wise";
  const isKmWise = trip.pricing_mode === "km_wise";

  // Split route into places
  const routePlaces = (trip.pickup_drop_place || "")
    .split("→")
    .map((p) => p.trim())
    .filter(Boolean);

  // Format date
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "N/A";

  const formatTime = (time) => time || "N/A";

  // Build table rows - matching image format
  let tableRows = "";
  routePlaces.forEach((place, index) => {
    const srNo = String(index + 1).padStart(2, "0");
    const isLastPlaceBeforeReturn = index === routePlaces.length - 2;

    // Check if this is a multi-stop
    const isStop =
      trip.multi_stops &&
      trip.stops &&
      trip.stops.some((s) => s.place === place);
    const placeDisplay = isStop
      ? `${place} <span style="color: #666; font-size: 11px; font-style: italic;">(Stop)</span>`
      : place;

    if (isLastPlaceBeforeReturn && (isDayWise || isKmWise)) {
      // Row with fare details
      tableRows += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${srNo}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;">${placeDisplay}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${
            isDayWise ? trip.per_day_cab_charges : trip.per_km_rate
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${
            isDayWise ? trip.total_days : trip.total_km
          }</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${(isDayWise
            ? trip.day_fare
            : trip.km_fare || 0
          ).toLocaleString("en-IN")}</td>
        </tr>`;
    } else {
      // Row without fare details
      tableRows += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${srNo}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: left;" colspan="4">${placeDisplay}</td>
        </tr>`;
    }
  });

  // Format trip type
  const tripTypeDisplay =
    quotation.trip_type === "round_trip"
      ? "Round Trip"
      : quotation.trip_type === "one_way"
      ? "One Way"
      : quotation.trip_type || "N/A";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    font-size: 11px;
    line-height: 1.4;
  }

  .page {
    width: 595px;
    margin: 0 auto;
    padding: 20px;
    background: #fff;
  }

  /* HEADER */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .company-info h2 {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 3px;
  }

  .company-info p {
    font-size: 10px;
    margin: 1px 0;
  }

  .logo {
    width: 60px;
    height: 60px;
  }

  .logo svg {
    width: 100%;
    height: 100%;
  }

  /* TITLE BAR */
  .title-bar {
    background: #e53935;
    color: #fff;
    text-align: center;
    padding: 8px;
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  /* INFO GRID */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 10px;
  }

  .info-box {
    padding: 5px;
  }

  .info-box strong {
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
  }

  .info-box p {
    margin: 2px 0;
    line-height: 1.3;
  }

  .trip-info {
    display: flex;
    justify-content: space-between;
    margin-top: 3px;
  }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5px;
    font-size: 10px;
  }

  thead {
    background: #f5f5f5;
  }

  th {
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 10px;

  }

  th.center {
    text-align: center;
  }

  td {
    padding: 6px 8px;
    border: 1px solid #ddd;
    font-size: 10px;
  }

  .total-row {
    text-align: right;
    padding: 8px;
    font-weight: bold;
    font-size: 11px;
  }

  /* BOTTOM SECTION */
  .bottom-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 15px;
    font-size: 10px;
  }

  .description-section h3 {
    font-size: 11px;
    margin-bottom: 8px;
    font-weight: bold;
  }

  .description-content {
    line-height: 1.5;
  }

  .description-content p {
    margin: 4px 0;
  }

  .charges-section {
   
    padding: 10px;
  }

  .charge-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dotted #ddd;
  }

  .charge-row:last-child {
    border-bottom: none;
  }

  .total-payable {
    background: #f5f5f5;
    padding: 8px;
    margin-top: 10px;
    font-weight: bold;
    text-align: center;
    font-size: 11px;
    border: 1px solid #ddd;
  }

  /* FOOTER */
  .footer {
    margin-top: 30px;
    padding-top: 10px;
    border-top: 2px solid #e53935;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
  }

  .footer-logo {
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: bold;
  }

  .footer-logo svg {
    width: 30px;
    height: 20px;
  }
</style>
</head>

<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="company-info">
      <h2>${company.company_name || "Vicky Cab Service"}</h2>
      <p>${company.address || "102/60 Sector 62 Noida Uttar Pradesh 201009"}</p>
      <p>Contact No: ${company.phone || "941 2222 322"}</p>
      <p>Email: ${company.email || "Vickeycabservice@Gmail.Com"}</p>
    </div>
    <div class="logo">
      <img src=${company.logo.url}  />
    </div>
  </div>

  <!-- TITLE BAR -->
  <div class="title-bar">${title}</div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <strong>Estimate For</strong>
      <p>${billTo.customer_name || "Aakash Doshi"}</p>
      <p>${billTo.address || "Rohini, New Delhi"}</p>
      <p>${billTo.contact_number || "+91 7894561230"}</p>
    </div>
    
    <div class="info-box">
      <strong>Pickup Date & Time</strong>
      <p>${formatDate(trip.pickup_date)} - ${formatTime(trip.pickup_time)}</p>
      <div class="trip-info">
        <span><strong>Trip Type:</strong> ${tripTypeDisplay}</span>
      </div>
    </div>
    
${
  quotation.trip_type === "round_trip"
    ? `
  <div class="info-box">
    <strong>Return Date & Time</strong>
    <p>
      ${formatDate(trip.return_date || trip.pickup_date)} - 
      ${formatTime(trip.return_time || "10:00 AM")}
    </p>
    <div class="trip-info">
      <span>
        <strong>Vehicle Type:</strong> ${trip.vehicle_type || "SUV"}
      </span>
    </div>
  </div>
`
    : ""
}

    
    <div class="info-box">
      <strong>Estimate Details</strong>
      <p>Date: ${formatDate(quotation.invoice_date)}</p>
      <p>Driver Id: ${company.driverPub || "07 Delhi"}</p>
    </div>
  </div>

  <!-- TRIP TABLE -->
  <table>
    <thead>
      <tr>
        <th class="center" style="width: 50px;">Sr.#</th>
        <th>Pickup & Drop Place</th>
        <th class="center" style="width: 80px;">${
          isDayWise ? "₹ Per Day" : "₹ Per Km"
        }</th>
        <th class="center" style="width: 80px;">${
          isDayWise ? "Total Day" : "Total Km"
        }</th>
        <th class="center" style="width: 80px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="total-row">
    Total : ₹${(
      summary.subtotal ||
      summary.km_fare_total ||
      summary.day_fare_total ||
      0
    ).toLocaleString("en-IN")}
  </div>

  <!-- BOTTOM SECTION -->
  <div class="bottom-section">
    
    <!-- DESCRIPTION -->
    <div class="description-section">
      <h3>Description:</h3>
      <div class="description-content">
        ${
          quotation.description
            ? quotation.description
                .split("\n")
                .map((line) => `<p>${line}</p>`)
                .join("")
            : `
        <p>Innova Crysta: ₹500/day</p>
        <p>Ertiga SUV: ₹4200/day</p>
        <p>Swift Dzire: ₹3500/day</p>
        <p><strong>This charges is maximum 250km</strong></p>
        <br>
        <p><strong>Extra: Toll tax, State tax</strong></p>
        <p>Parking charge and Driver charge and</p>
        <p><strong>Extra km and Extra time charges:</strong></p>
        <p>₹15/km and ₹250/hour</p>
        <br>
        <p><strong>Payment condition</strong></p>
        <p>10% cab booking in advance</p>
        <p>50% payment pickup time</p>
        <p>40% last payment 2 hours before drop</p>
        <br>
        <p><strong>WhatsApp your details</strong></p>
        <p>in advance with ID proof and photo</p>
        <br>
        <p><strong>Payment Details</strong></p>
        <p>Paytm, Phone pay, Google pay all accepted</p>
        <p>Payment no. +91 94122 22322</p>
        `
        }
      </div>
    </div>
    <div>
      <h3>Term & Conditions:</h3>
  <div class="description-content">
  ${quotation.terms_and_conditions}
  </div>
    </div>

    <!-- CHARGES -->
    <div class="charges-section">
      <div class="charge-row">
        <span>Toll & State Tax</span>
        <span>: ₹${(summary.toll_tax_total || 1000).toLocaleString(
          "en-IN"
        )}</span>
      </div>
      <div class="charge-row">
        <span>State Tax</span>
        <span>: ₹${(summary.state_tax || 800).toLocaleString("en-IN")}</span>
      </div>
      <div class="charge-row">
        <span>Driver Charges</span>
        <span>: ₹${(summary.driver_charge || 900).toLocaleString(
          "en-IN"
        )}</span>
      </div>
      <div class="charge-row">
        <span>Parking Charges</span>
        <span>: ₹${(summary.parking_charge || 600).toLocaleString(
          "en-IN"
        )}</span>
      </div>
      ${
        summary.additional_charges
          ?.map(
            (c) => `
        <div class="charge-row">
          <span>${c.title}</span>
          <span>: ₹${c.amount.toLocaleString("en-IN")}</span>
        </div>
      `
          )
          .join("") || ""
      }
      
      <div class="total-payable">
        Total Amount Payable : ₹${(summary.grand_total || 10300).toLocaleString(
          "en-IN"
        )}
      </div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-logo">
      <img src=${company.logo.url}  />
      <span style="color: #e53935; font-weight: bold;">${
        company?.company_name
      }</span>
    </div>
    <div>www.taxisafar.com</div>
  </div>

</div>

</body>
</html>
  `;
};

// ============================================
// CREATE QUOTATION - WITH DEVELOPMENT PREVIEW
// ============================================

exports.createQuotation = async (req, res) => {
  try {
    const driverId = req.user.id;
    const documentType = req.body.document_type || "quotation";

    // Check if development mode
    const isDevelopment = process.env.NODE_ENV === "development";
    const previewMode = req.query.preview === "true" || isDevelopment;

    console.log("📥 Received Body:", req.body);
    console.log("📥 previewMode Body:", previewMode);

    /* -------------------------------------------------
       1️⃣ Company & Bank Details
    -------------------------------------------------- */
    const company = await ComopanyDetails.findOne({
      driver: driverId,
    }).populate({
      path: "driver",
      select: "driver_name driver_contact_number",
      populate: {
        path: "current_vehicle_id",
        select: "vehicle_number",
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company details not found. Please add company details first.",
      });
    }

    // Bank details - use from body if show_bank_details is true
    const bankDetailsFromBody =
      req.body.show_bank_details && req.body.bank_details
        ? req.body.bank_details
        : null;

    /* -------------------------------------------------
       2️⃣ Invoice Number
    -------------------------------------------------- */
    const invoiceNumber = await generateInvoiceNumber();

    /* -------------------------------------------------
       3️⃣ Multi-Stops Handling
    -------------------------------------------------- */
    const multiStop = req.body.multi_stop || false;
    const stops = Array.isArray(req.body.stops)
      ? req.body.stops.map((place) => ({
          place: String(place).trim(),
          charge: 0,
        }))
      : [];

    /* -------------------------------------------------
       4️⃣ Build Trip Details (Single Trip)
    -------------------------------------------------- */
    const pricingMode = req.body.pricing_mode || "km_wise";

    let kmFare = 0;
    let dayFare = 0;

    if (pricingMode === "km_wise") {
      const totalKm = parseFloat(req.body.total_km) || 0;
      const perKmRate = parseFloat(req.body.per_km_rate) || 0;
      kmFare = totalKm * perKmRate;
    } else if (pricingMode === "day_wise") {
      const totalDays = parseInt(req.body.total_days) || 1;
      const perDayCharges =
        parseFloat(req.body.per_day_cab_charges || req.body.per_day_charges) ||
        0;
      dayFare = totalDays * perDayCharges;
    }

    const tollTax =
      parseFloat(req.body.toll_tax || req.body.toll_tax_amount || 0) || 0;

    const tripDetails = [
      {
        sn: 1,
        pickup_drop_place:
          req.body.pickup_drop_place ||
          `${req.body.pickup_place} → ${req.body.drop_place}`,
        vehicle_type: req.body.vehicle_type,

        pickup_date: req.body.pickup_date,
        pickup_time: req.body.pickup_time,
        return_date: req.body.return_date || req.body.pickup_date,
        return_time: req.body.return_time || "10:00 AM",

        pricing_mode: pricingMode,

        total_km:
          pricingMode === "km_wise" ? parseFloat(req.body.total_km) || 0 : 0,
        per_km_rate:
          pricingMode === "km_wise" ? parseFloat(req.body.per_km_rate) || 0 : 0,
        km_fare: kmFare,

        total_days:
          pricingMode === "day_wise" ? parseInt(req.body.total_days) || 1 : 0,
        per_day_cab_charges:
          pricingMode === "day_wise"
            ? parseFloat(
                req.body.per_day_cab_charges || req.body.per_day_charges
              ) || 0
            : 0,
        day_fare: dayFare,

        toll_tax_amount: tollTax,

        multi_stops: multiStop,
        stops: stops,

        extra_charges: [],

        stop_charges_total: 0,
        total_amount: kmFare + dayFare + tollTax,
      },
    ];

    /* -------------------------------------------------
       5️⃣ Summary from Request (Trust Frontend Calculation)
    -------------------------------------------------- */
    const summaryReq = req.body.summary || {};

    const grandTotal =
      parseFloat(summaryReq.total || summaryReq.grand_total) || 0;

    // Amount in words
    const rupees = Math.floor(grandTotal);
    const paise = Math.round((grandTotal - rupees) * 100);
    let amountInWords = numberToWords(rupees);
    if (paise > 0) {
      amountInWords += ` And ${numberToWords(paise)} Paise Only`;
    } else {
      amountInWords += " Only";
    }

    /* -------------------------------------------------
       6️⃣ Create Quotation/Invoice
    -------------------------------------------------- */
    const quotation = await Quotations.create({
      driver: driverId,
      company_id: company._id,
      driver_name: company?.driver?.driver_name,
      vehicle_number: company?.driver?.current_vehicle_id?.vehicle_number,

      invoice_number: invoiceNumber,
      invoice_date: new Date(),
      document_type: documentType,

      bill_to: {
        customer_name: req.body.bill_to?.customer_name || "",
        contact_number: req.body.bill_to?.contact_number || "",
        email: req.body.bill_to?.email || "",
        address: req.body.bill_to?.address || "",
      },

      trip_type: req.body.trip_type || "one_way",
      pricing_mode: pricingMode,

      pickup_place: req.body.pickup_place,
      drop_place: req.body.drop_place,
      pickup_drop_place:
        req.body.pickup_drop_place ||
        `${req.body.pickup_place} → ${req.body.drop_place}`,

      trip_details: tripDetails,

      multi_stops: multiStop,
      stops: stops,

      summary: {
        base_fare_total: kmFare + dayFare,
        km_fare_total: kmFare,
        day_fare_total: dayFare,
        toll_tax_total: tollTax,

        state_tax: parseFloat(summaryReq.state_tax) || 0,
        driver_charge: parseFloat(summaryReq.driver_charge) || 0,
        parking_charge: parseFloat(summaryReq.parking_charge) || 0,

        extra_charges_total: 0,
        additional_charges: summaryReq.additional_charges || [],

        discount: parseFloat(summaryReq.discount) || 0,
        gst_applied: summaryReq.gst_applied || false,
        gst_amount: parseFloat(summaryReq.gst_amount) || 0,

        subtotal: parseFloat(summaryReq.subtotal) || kmFare + dayFare,
        grand_total: grandTotal,
        total: grandTotal,
        amount_in_words: amountInWords,
      },

      show_bank_details: req.body.show_bank_details || false,
      bank_details: bankDetailsFromBody
        ? {
            bank_name: bankDetailsFromBody.bank_name,
            account_number: bankDetailsFromBody.account_number,
            ifsc_code: bankDetailsFromBody.ifsc_code,
            account_holder_name: bankDetailsFromBody.account_holder_name,
          }
        : null,

      description: req.body.description || req.body.terms_and_conditions || "",
      terms_and_conditions:"You acknowledge and agree to accept all terms and conditions of the driver as applicable to this trip.",
      place_of_supply: req.body.place_of_supply || "Delhi",
      hsn_code: req.body.hsn_code || "996412",
      order_id: req.body.order_id || null,
    });

    /* -------------------------------------------------
       7️⃣ Generate HTML (and PDF in production)
    -------------------------------------------------- */
    const html = generateHTMLTemplate(quotation, company, documentType);

    // 🔥 DEVELOPMENT MODE: Return HTML for preview
    if (previewMode) {
      console.log("🔍 Development Mode: Returning HTML preview");

      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Quotation Preview - Development Mode</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: #f0f0f0;
              font-family: Arial, sans-serif;
            }
            .preview-container {
              max-width: 1200px;
              margin: 0 auto;
            }
            .preview-header {
              background: #333;
              color: white;
              padding: 15px 20px;
              border-radius: 5px 5px 0 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .preview-header h2 {
              margin: 0;
              font-size: 18px;
            }
            .preview-actions {
              display: flex;
              gap: 10px;
            }
            .btn {
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            }
            .btn-primary {
              background: #4CAF50;
              color: white;
            }
            .btn-secondary {
              background: #2196F3;
              color: white;
            }
            .preview-body {
              background: white;
              padding: 20px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-radius: 0 0 5px 5px;
            }
            iframe {
              width: 100%;
              height: 1000px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            <div class="preview-header">
              <h2>📄 Quotation Preview - Development Mode</h2>
              <div class="preview-actions">
                <button class="btn btn-primary" onclick="window.print()">🖨️ Print</button>
                <button class="btn btn-secondary" onclick="downloadHTML()">💾 Download HTML</button>
              </div>
            </div>
            <div class="preview-body">
              <iframe srcdoc="${html.replace(/"/g, "&quot;")}"></iframe>
            </div>
          </div>

          <script>
            function downloadHTML() {
              const html = \`${html.replace(/`/g, "\\`")}\`;
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'quotation_${quotation.invoice_number}.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          </script>
        </body>
        </html>
      `);
    }

    // 🚀 PRODUCTION MODE: Generate PDF and upload to Cloudinary
    const pdfBuffer = await generatePDF(html);
    const pdfUpload = await uploadSingleImage(
      Buffer.from(pdfBuffer),
      "quotations"
    );

    quotation.pdf = {
      url: pdfUpload.image || pdfUpload.url,
      public_id: pdfUpload.public_id,
    };
    await quotation.save();

    return res.status(201).json({
      success: true,
      message:
        documentType === "quotation"
          ? "Quotation created successfully"
          : "Tax Invoice created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("❌ Create Quotation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create document",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
exports.convertToInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    /* -------------------------------------------------
       1️⃣ Fetch quotation
    -------------------------------------------------- */
    const quotation = await Quotations.findById(id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    if (quotation.document_type === "invoice") {
      return res.status(400).json({
        success: false,
        message: "Already converted to invoice",
      });
    }

    /* -------------------------------------------------
       2️⃣ Fetch company (required for PDF)
    -------------------------------------------------- */
    const company = await ComopanyDetails.findById(
      quotation.company_id
    ).populate({
      path: "driver",
      select: "driver_name driver_contact_number",
      populate: {
        path: "current_vehicle_id",
        select: "vehicle_number",
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    /* -------------------------------------------------
       3️⃣ Update quotation → invoice
    -------------------------------------------------- */
    const invoiceNumber = await generateInvoiceNewNumber();
    console.log("nvoiceNumber", invoiceNumber);
    quotation.document_type = "invoice";
    quotation.invoice_number = invoiceNumber;
    quotation.invoice_date = new Date();
    quotation.status = "invoiced";
    await quotation.save();

    /* -------------------------------------------------
       4️⃣ Generate TAX INVOICE PDF
    -------------------------------------------------- */

    const html = generateHTMLTemplate(quotation, company, "invoice");
    const pdfBuffer = await generatePDF(html);
    const pdfBufferSend = Buffer.from(pdfBuffer);

    const pdfUpload = await uploadSingleImage(
      pdfBufferSend,
      "invoices" // 👈 correct folder
    );

    console.log("pdfUpload", pdfUpload);

    /* -------------------------------------------------
       5️⃣ REPLACE PDF URL
    -------------------------------------------------- */
    quotation.pdf = {
      url: pdfUpload.image || pdfUpload.url,
      public_id: pdfUpload.public_id,
      is_locked: true, // optional but recommended
    };

    await quotation.save();

    /* -------------------------------------------------
       6️⃣ Response 
    -------------------------------------------------- */

    return res.status(200).json({
      success: true,
      message: "Quotation converted to Tax Invoice successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("❌ Convert To Invoice Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to convert quotation to invoice",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

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
    // const driverId = req.user.id;
    const quotationId = req.params.id;
    console.log("quotationId", quotationId);
    const quotation = await Quotations.findOne({
      _id: quotationId,
      // driver: driverId,
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
    const documentType = req.body.document_type || "quotation";

    /* -------------------------------------------------
       1️⃣ Find existing quotation
    -------------------------------------------------- */
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

    /* -------------------------------------------------
       2️⃣ Multi-Stops Handling (SAME AS CREATE)
    -------------------------------------------------- */
    const multiStop = req.body.multi_stop || false;

    const stops = Array.isArray(req.body.stops)
      ? req.body.stops.map((place) => ({
          place: String(place).trim(),
          charge: 0,
        }))
      : [];

    /* -------------------------------------------------
       3️⃣ Pricing Calculation (SAME AS CREATE)
    -------------------------------------------------- */
    const pricingMode = req.body.pricing_mode || "km_wise";

    let kmFare = 0;
    let dayFare = 0;

    if (pricingMode === "km_wise") {
      const totalKm = parseFloat(req.body.total_km) || 0;
      const perKmRate = parseFloat(req.body.per_km_rate) || 0;
      kmFare = totalKm * perKmRate;
    } else if (pricingMode === "day_wise") {
      const totalDays = parseInt(req.body.total_days) || 1;
      const perDayCharges =
        parseFloat(req.body.per_day_cab_charges || req.body.per_day_charges) ||
        0;
      dayFare = totalDays * perDayCharges;
    }

    const tollTax =
      parseFloat(req.body.toll_tax || req.body.toll_tax_amount || 0) || 0;

    /* -------------------------------------------------
       4️⃣ Build Trip Details (IDENTICAL TO CREATE)
    -------------------------------------------------- */
    const tripDetails = [
      {
        sn: 1,
        pickup_drop_place:
          req.body.pickup_drop_place ||
          `${req.body.pickup_place} → ${req.body.drop_place}`,

        vehicle_type: req.body.vehicle_type,

        pickup_date: req.body.pickup_date,
        pickup_time: req.body.pickup_time,
        return_date: req.body.return_date || req.body.pickup_date,
        return_time: req.body.return_time || "10:00 AM",

        pricing_mode: pricingMode,

        total_km:
          pricingMode === "km_wise" ? parseFloat(req.body.total_km) || 0 : 0,
        per_km_rate:
          pricingMode === "km_wise" ? parseFloat(req.body.per_km_rate) || 0 : 0,
        km_fare: kmFare,

        total_days:
          pricingMode === "day_wise" ? parseInt(req.body.total_days) || 1 : 0,
        per_day_cab_charges:
          pricingMode === "day_wise"
            ? parseFloat(
                req.body.per_day_cab_charges || req.body.per_day_charges
              ) || 0
            : 0,
        day_fare: dayFare,

        toll_tax_amount: tollTax,

        multi_stops: multiStop,
        stops: stops,

        extra_charges: [],
        stop_charges_total: 0,

        total_amount: kmFare + dayFare + tollTax,
      },
    ];

    /* -------------------------------------------------
       5️⃣ Summary (TRUST FRONTEND – SAME AS CREATE)
    -------------------------------------------------- */
    const summaryReq = req.body.summary || {};

    const grandTotal =
      parseFloat(summaryReq.total || summaryReq.grand_total) || 0;

    // Amount in words
    const rupees = Math.floor(grandTotal);
    const paise = Math.round((grandTotal - rupees) * 100);

    let amountInWords = numberToWords(rupees);
    if (paise > 0) {
      amountInWords += ` And ${numberToWords(paise)} Paise Only`;
    } else {
      amountInWords += " Only";
    }

    /* -------------------------------------------------
       6️⃣ Update quotation document
    -------------------------------------------------- */
    quotation.set({
      document_type: documentType,

      bill_to: {
        customer_name: req.body.bill_to?.customer_name || "",
        contact_number: req.body.bill_to?.contact_number || "",
        email: req.body.bill_to?.email || "",
        address: req.body.bill_to?.address || "",
      },

      trip_type: req.body.trip_type || "one_way",
      pricing_mode: pricingMode,

      pickup_place: req.body.pickup_place,
      drop_place: req.body.drop_place,
      pickup_drop_place:
        req.body.pickup_drop_place ||
        `${req.body.pickup_place} → ${req.body.drop_place}`,

      trip_details: tripDetails,

      multi_stops: multiStop,
      stops: stops,

      summary: {
        base_fare_total: kmFare + dayFare,
        km_fare_total: kmFare,
        day_fare_total: dayFare,
        toll_tax_total: tollTax,

        state_tax: parseFloat(summaryReq.state_tax) || 0,
        driver_charge: parseFloat(summaryReq.driver_charge) || 0,
        parking_charge: parseFloat(summaryReq.parking_charge) || 0,

        extra_charges_total: 0,
        additional_charges: summaryReq.additional_charges || [],

        discount: parseFloat(summaryReq.discount) || 0,
        gst_applied: summaryReq.gst_applied || false,
        gst_amount: parseFloat(summaryReq.gst_amount) || 0,

        subtotal:
          parseFloat(summaryReq.subtotal) || kmFare + dayFare,

        grand_total: grandTotal,
        total: grandTotal,
        amount_in_words: amountInWords,
      },

      show_bank_details: req.body.show_bank_details || false,
      bank_details: req.body.show_bank_details
        ? req.body.bank_details
        : null,

      description: req.body.description || req.body.terms_and_conditions || "",
      terms_and_conditions:
        "You acknowledge and agree to accept all terms and conditions of the driver as applicable to this trip.",

      place_of_supply: req.body.place_of_supply || "Delhi",
      hsn_code: req.body.hsn_code || "996412",
    });

    await quotation.save();

    return res.json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("❌ Update Quotation Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quotation",
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
