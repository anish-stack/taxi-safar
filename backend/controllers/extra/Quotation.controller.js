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
  return `TS${String(count + 1).padStart(4, "0")}`;
};


const generateInvoiceNewNumber = async () => {
  let invoice;
  let exists = true;

  while (exists) {
    const count = await Quotations.countDocuments({
      invoice_number: /^TSI\d{4}$/
    });

    invoice = `TSI${String(count + 1).padStart(4, "0")}`;
    exists = await Quotations.exists({ invoice_number: invoice });
  }

  return invoice;
};


const generateHTMLTemplate = (
  quotation,
  company,
  documentType = "quotation"
) => {
  // Safely extract values with error handling
  const isInvoice = documentType === "invoice";
  const title = isInvoice ? "TAX INVOICE" : "Your Estimate Quotation";

  // Safe access to nested objects with defaults
  const billTo = quotation?.bill_to ?? {};
  const summary = quotation?.summary ?? {};
  const tripDetails = quotation?.trip_details ?? [];
  const trip = tripDetails[0] ?? {};
  const bankDetails = quotation?.bank_details ?? null;

  // Safe access to company details
  const companyInfo = {
    name: company?.company_name ?? "Cab Service",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
    email: company?.email ?? "",
    logo: company?.logo?.url ?? null,
    signature: company?.signature?.url ?? null,
  };
const documentNumber = quotation?.orderId ?? quotation?.invoice_number ?? "N/A";
const documentLabel = isInvoice ? "Invoice No." : "Quotation No.";
  const isDayWise = trip?.pricing_mode === "day_wise";
  const isKmWise = trip?.pricing_mode === "km_wise";
  const isRoundTrip = quotation?.trip_type === "round_trip";

  // Split route into places with error handling
  const baseRoutePlaces = (trip?.pickup_drop_place ?? "")
    .split("→")
    .map((p) => p.trim())
    .filter(Boolean);

  // Build full route with stops if multi_stops is true
  let routePlaces = [...baseRoutePlaces];
  if (
    trip?.multi_stops &&
    Array.isArray(trip?.stops) &&
    trip.stops.length > 0
  ) {
    const pickup = routePlaces[0];
    const drop = routePlaces[routePlaces.length - 1];
    const stops = trip.stops.map((s) => s?.place).filter(Boolean);
    routePlaces = [pickup, ...stops, drop];
  }

  // Format date safely
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatTime = (time) => time ?? "N/A";
  const termsAndConditions = quotation?.terms_and_conditions ?? "";
  // Safe number formatting
  const formatAmount = (amount) => {
    const num = Number(amount) || 0;
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Build table rows
  let tableRows = "";
  if (routePlaces.length > 0) {
    routePlaces.forEach((place, index) => {
      const srNo = String(index + 1).padStart(2, "0");

      // Determine which row gets the pricing details
      const pricingRowIndex = routePlaces.length - (isRoundTrip ? 2 : 1);
      const isPricingRow = index === pricingRowIndex;

      // Return row only for round trip (last row)
      const isReturnRow = index === routePlaces.length - 1 && isRoundTrip;

      let rateCell = ""; // ₹ Per Day or ₹ Per Km
      let quantityCell = ""; // Total Day or Total Km
      let amountCell = ""; // Final fare amount

      if (isPricingRow) {
        if (isDayWise) {
          rateCell = formatAmount(trip?.per_day_cab_charges ?? 0);
          quantityCell = trip?.total_days ?? 0;
          amountCell = formatAmount(trip?.day_fare ?? 0);
        } else if (isKmWise) {
          rateCell = formatAmount(trip?.per_km_rate ?? 0);
          quantityCell = trip?.total_km ?? 0;
          amountCell = formatAmount(trip?.km_fare ?? 0);
        }
      }

      tableRows += `
      <tr>
        <td style="text-align: center;">${srNo}</td>
        <td>${place}${isReturnRow ? " (Return)" : ""}</td>
        <td style="text-align: center;">${rateCell}</td>
        <td style="text-align: center;">${quantityCell}</td>
        <td style="text-align: right;">${amountCell}</td>
      </tr>`;
    });
  } else {
    tableRows = `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;" colspan="5">No route information available</td>
    </tr>`;
  }

  // Trip type display
  const tripTypeDisplay =
    quotation?.trip_type === "round_trip"
      ? "Round Trip"
      : quotation?.trip_type === "one_way"
      ? "One Way"
      : "N/A";

  // Additional charges rows
  let additionalChargeRows = "";
  if (
    Array.isArray(summary?.additional_charges) &&
    summary.additional_charges.length > 0
  ) {
    summary.additional_charges.forEach((charge) => {
      if (charge?.amount > 0) {
        additionalChargeRows += `
          <div class="charge-row">
            <div class="label">
              <span>${charge.title || "Additional Charge"}</span>
              <span>:</span>
            </div>
            <div class="value">₹${formatAmount(charge.amount)}</div>
          </div>`;
      }
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - ${companyInfo.name}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
       
      }

      .quotation-container {
        width: 650px;
        position: relative;
        margin: 0 auto;
        overflow: hidden;
        background: white;
        padding: 35px 40px;
      }

      /* Header Section */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .company-details {
        flex: 1;
      }

      .company-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .company-info {
        font-size: 11px;
        line-height: 1.6;
      }

      .logo {
        width: 80px;
      
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* Red Banner */
      .red-banner {
        background: #e52710;
        color: white;
        text-align: center;
        padding: 8px;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 20px;
      }

      /* Info Section */
      .info-section {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 15px;
        margin-bottom: 15px;
        font-size: 11px;
      }

      .info-block label {
        font-weight: bold;
        display: block;
        margin-bottom: 3px;
      }

      .info-block div {
        line-height: 1.5;
      }

      /* Trip Type Section */
      .trip-info {
        display: flex;
        gap: 40px;
        margin-bottom: 15px;
        font-size: 11px;
        font-weight: bold;
      }

      /* Table */
      .table-wrapper {
        margin-bottom: 15px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }

      thead {
        background: #f5f5f5;
      }

      th {
        padding: 8px 5px;
        text-align: left;
        font-weight: 600;
        font-size: 10px;
      }

      td {
        padding: 8px 5px;
      }

      th:nth-child(3),
      th:nth-child(4),
      th:nth-child(5),
      td:nth-child(3),
      td:nth-child(4),
      td:nth-child(5) {
        text-align: center;
      }

      th:last-child,
      td:last-child {
        text-align: right;
      }

      /* Bottom Section */
      .bottom-section {
        display: flex;
        gap: 30px;
        margin-top: 20px;
      }

      .description {
        flex: 1;
        font-size: 10px;
        line-height: 1.6;
      }

      .description strong {
        display: block;
        margin-top: 10px;
        margin-bottom: 3px;
        font-size: 11px;
      }



      .charge-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 11px;
      }

      .charge-row .label {
        display: flex;
        gap: 10px;
      }

      .charge-row .value {
        font-weight: 600;
      }
        charges-signature-container {
  display: flex;
  gap: 30px;
  align-items: flex-end; /* Aligns signature to bottom */
  min-width: 400px;
}

.charges {
  flex: 1;
  min-width: 260px;
}

/* Signature Box */
.signature-box {
  text-align: center;
  font-size: 11px;
  color: #333;
  border: 1px dashed #999;
  padding: 15px 20px;
  border-radius: 8px;
  background: #f9f9f9;
  min-width: 200px;
}

.signature-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: #e52710;
}

.signature-img {
  max-width: 180px;
  max-height: 80px;
  object-fit: contain;
  margin: 10px 0;
}

.signature-line {
  height: 80px;
  border-bottom: 2px solid #333;
  margin: 15px 0;
  width: 180px;
  margin-left: auto;
  margin-right: auto;
}

.company-name-sign {
  margin-top: 8px;
  font-weight: 600;
}

.stamp-text {
  margin-top: 5px;
  font-style: italic;
  color: #e52710;
  font-weight: 600;
}

      .total-payable-box {
        background: #f8f8f8;
        padding: 10px;
        margin-top: 10px;
         margin-top: 10px;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: bold;
      }

      /* Footer */
      .footer {
        width: 100%;
        margin-top: 40px;
        border-top: 3px solid #e52710;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .footer-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 13px;
      }

      .footer-icon {
        width: 28px;
        height: 28px;
        border-radius: 3px;
        overflow: hidden;
      }

      .footer-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .footer-website {
        font-size: 11px;
      }
    </style>
  </head>
  <body>
    <div class="quotation-container">
      <!-- Header -->
     <div class="header">
  <div class="company-details">
    <div class="company-name">${companyInfo.name}</div>
    <div class="company-info">
      ${companyInfo.address.replace(/\n/g, '<br />')}<br />
      Contact No: ${companyInfo.phone}<br />
      Email: ${companyInfo.email}
    </div>
  </div>

  <!-- Logo + Document Number (Top Right) -->
  <div class="logo-section">
    ${companyInfo.logo ? `
    <div class="logo">
      <img src="${companyInfo.logo}" alt="Company Logo" />
    </div>` : ''}

    <!-- Quotation / Invoice Number -->
    <div class="document-number">
      <div class="doc-label">${documentLabel}</div>
      <div class="doc-value">${documentNumber}</div>
      <div class="doc-date">Date: ${formatDate(quotation.invoice_date || new Date())}</div>
    </div>
  </div>
</div>

      <!-- Red Banner -->
      <div class="red-banner">${title}</div>

      <!-- Info Section -->
      <div class="info-section">
        <div class="info-block">
          <label>Estimate For</label>
          <div>
            <strong>${billTo.customer_name || "N/A"}</strong><br />
            ${billTo.address || ""}<br />
            ${billTo.contact_number ? "+91 " + billTo.contact_number : ""}
          </div>
        </div>
        <div class="info-block">
          <label>Pickup Date</label>
          <div>${formatDate(trip.pickup_date)} - ${formatTime(
    trip.pickup_time
  )}</div>
        </div>
        <div class="info-block">
          <label>Drop Date</label>
          <div>${
            isRoundTrip
              ? `${formatDate(trip.return_date)} - ${formatTime(
                  trip.return_time
                )}`
              : ""
          }</div>
        </div>
        <div class="info-block">
          <label>Estimate Details</label>
          <div>
            Date: ${formatDate(quotation.invoice_date)}<br />
            Place of supply: ${quotation.place_of_supply || "N/A"}
          </div>
        </div>
      </div>

      <!-- Trip Info -->
      <div class="trip-info">
        <span>Trip Type: ${tripTypeDisplay}</span>
        <span>Vehicle Type: ${trip.vehicle_type || "N/A"}</span>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
            <th>Sr.</th>
    <th>Pickup & Drop Place</th>
    <th>₹ ${isDayWise ? "Per Day" : "Per Km"}</th>
    <th>${isDayWise ? "Total Day" : "Total Km"}</th>
    <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- Bottom Section -->
  
   <div class="bottom-section">
  <!-- Left: Description, Terms & Payment Details (Only if data exists) -->
  <div class="description">
    ${
      quotation?.description
        ? `
      <strong>Description:</strong><br />
      ${quotation.description.replace(/\n/g, "<br />")}<br /><br />`
        : ""
    }

    ${
      termsAndConditions
        ? `
      <strong>Terms & Conditions:</strong><br />
      ${termsAndConditions.replace(/\n/g, "<br />")}<br /><br />`
        : ""
    }

    ${
      bankDetails
        ? `
      <strong>Payment Details</strong><br />
      Bank: ${bankDetails.bank_name}<br />
      A/c No: ${bankDetails.account_number}<br />
      IFSC: ${bankDetails.ifsc_code}<br />
      A/c Holder: ${bankDetails.account_holder_name}<br /><br />`
        : ""
    }
  </div>

  <!-- Right: Charges + Signature Box (Side by Side) -->
  <div class="charges-signature-container">
    <!-- Charges List -->
    <div class="charges">
      <div class="charge-row">
        <div class="label"><span>Subtotal</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.subtotal ?? 0)}</div>
      </div>

      ${
        summary.toll_tax_total > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>Toll Tax</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.toll_tax_total)}</div>
      </div>`
          : ""
      }

      ${
        summary.state_tax > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>State Tax</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.state_tax)}</div>
      </div>`
          : ""
      }

      ${
        summary.driver_charge > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>Driver Charges</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.driver_charge)}</div>
      </div>`
          : ""
      }

      ${
        summary.parking_charge > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>Parking Charges</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.parking_charge)}</div>
      </div>`
          : ""
      }

      ${additionalChargeRows}

      ${
        summary.discount > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>Discount</span><span>:</span></div>
        <div class="value">-₹${formatAmount(summary.discount)}</div>
      </div>`
          : ""
      }

      ${
        summary.gst_applied && summary.gst_amount > 0
          ? `
      <div class="charge-row">
        <div class="label"><span>GST</span><span>:</span></div>
        <div class="value">₹${formatAmount(summary.gst_amount)}</div>
      </div>`
          : ""
      }

      <div class="total-payable-box">
        <span>Total Amount Payable</span>
        <span>₹${formatAmount(summary.grand_total ?? summary.total ?? 0)}</span>
      </div>
    </div>

    <!-- Signature Box (Right Side) -->
    <div class="signature-box">
      <div class="signature-label">Authorized Signatory</div>
      ${
        companyInfo.signature
          ? `
        <img src="${companyInfo.signature}" alt="Signature" class="signature-img" />
      `
          : `
        <div class="signature-line"></div>
      `
      }
     
    </div>
  </div>
</div>

      <!-- Footer -->
       <div class="footer">
        <div class="footer-logo">
          <div class="footer-icon">
            <img src="https://res.cloudinary.com/dglihfwse/image/upload/v1766414541/ic_taxi_safar_logo_ksfquk.png" style="width: 100%" />
          </div>
          <svg width="57" height="11" viewBox="0 0 57 11" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M53.7482 5.0657L52.8335 10.3418H50.6528L51.8989 3.17003H53.9272L53.7482 5.0657ZM56.0946 3.11037L55.8096 5.19164C55.6947 5.17396 55.5798 5.1585 55.4649 5.14524C55.35 5.13199 55.2329 5.12315 55.1136 5.11873C54.8706 5.11431 54.6496 5.14303 54.4508 5.2049C54.2564 5.26234 54.0862 5.35293 53.9404 5.47665C53.799 5.59596 53.6819 5.7462 53.5891 5.92737C53.4963 6.10855 53.4278 6.31844 53.3837 6.55706L53.0191 6.29193C53.0633 5.9561 53.134 5.60038 53.2312 5.22478C53.3328 4.84476 53.4742 4.48684 53.6554 4.15101C53.8366 3.81518 54.0708 3.54342 54.358 3.33573C54.6452 3.12363 54.9987 3.01758 55.4185 3.01758C55.5334 3.01758 55.6461 3.02642 55.7566 3.04409C55.867 3.06177 55.9797 3.08386 56.0946 3.11037Z" fill="#E52710"/>
<path d="M47.5774 8.5378L48.0413 5.55509C48.059 5.39601 48.0568 5.24356 48.0347 5.09774C48.017 4.95192 47.9618 4.83261 47.869 4.73982C47.7806 4.6426 47.6414 4.59179 47.4514 4.58737C47.2791 4.58295 47.1333 4.61388 47.014 4.68016C46.8947 4.74645 46.7997 4.83924 46.729 4.95855C46.6583 5.07786 46.6074 5.21484 46.5765 5.3695L44.3892 5.38276C44.4069 4.96739 44.5173 4.60946 44.7206 4.30898C44.9239 4.0085 45.1846 3.76326 45.5027 3.57325C45.8209 3.38324 46.1678 3.24405 46.5434 3.15567C46.9234 3.06729 47.2968 3.02752 47.6635 3.03636C48.1673 3.0452 48.6224 3.15125 49.029 3.35452C49.4399 3.55336 49.7558 3.8428 49.9768 4.22282C50.2021 4.59842 50.2883 5.05576 50.2353 5.59486L49.7647 8.5378C49.7249 8.80293 49.6896 9.08573 49.6586 9.38621C49.6277 9.68227 49.6719 9.95845 49.7912 10.2147L49.7846 10.3407L47.6569 10.3473C47.5597 10.0601 47.5111 9.76181 47.5111 9.45249C47.5111 9.14318 47.5332 8.83828 47.5774 8.5378ZM48.2866 5.95941L48.0877 7.1525L47.2327 7.14587C47.0648 7.15029 46.9035 7.17901 46.7488 7.23204C46.5986 7.28064 46.4638 7.35134 46.3445 7.44414C46.2252 7.53693 46.1258 7.65182 46.0463 7.78881C45.9711 7.92579 45.9225 8.08266 45.9004 8.25941C45.8828 8.37872 45.8916 8.48698 45.9269 8.5842C45.9667 8.67699 46.0264 8.75211 46.1059 8.80956C46.1899 8.867 46.2937 8.89793 46.4174 8.90235C46.6074 8.90677 46.7908 8.87142 46.9676 8.7963C47.1443 8.72118 47.2968 8.61513 47.4249 8.47814C47.5575 8.34116 47.6481 8.18208 47.6967 8.00091L48.0811 8.93549C47.9662 9.16527 47.8337 9.37517 47.6834 9.56517C47.5376 9.75518 47.3719 9.92089 47.1863 10.0623C47.0051 10.1993 46.8019 10.3053 46.5765 10.3804C46.3512 10.4556 46.1015 10.4909 45.8275 10.4865C45.4342 10.4777 45.0719 10.3827 44.7405 10.2015C44.4091 10.0203 44.1462 9.77286 43.9517 9.45912C43.7573 9.14539 43.6667 8.78304 43.68 8.37209C43.6977 7.89486 43.8148 7.49937 44.0313 7.18564C44.2478 6.8719 44.5284 6.62666 44.8731 6.4499C45.2221 6.26873 45.6 6.14059 46.0065 6.06547C46.4174 5.99035 46.824 5.95279 47.2261 5.95279L48.2866 5.95941Z" fill="#E52710"/>
<path d="M41.5188 10.3406H39.3249L40.6439 2.58555C40.7146 2.04204 40.8825 1.57585 41.1476 1.187C41.4127 0.798139 41.7574 0.502078 42.1816 0.298812C42.6102 0.091127 43.1007 -0.00829657 43.6531 0.00054108C43.8387 0.0049599 44.022 0.0226352 44.2032 0.053567C44.3844 0.0800799 44.5634 0.113221 44.7401 0.152991L44.5744 1.80342C44.4904 1.78133 44.4043 1.76365 44.3159 1.7504C44.2275 1.73714 44.1391 1.7283 44.0508 1.72388C43.8563 1.72388 43.6752 1.75481 43.5073 1.81668C43.3438 1.87854 43.2046 1.97355 43.0897 2.10169C42.9748 2.22542 42.8975 2.38671 42.8577 2.58555L41.5188 10.3406ZM44.1171 3.16884L43.8387 4.71985H39.2983L39.5701 3.16884H44.1171Z" fill="#E52710"/>
<path d="M35.7927 8.5378L36.2567 5.55509C36.2744 5.39601 36.2721 5.24356 36.2501 5.09774C36.2324 4.95192 36.1771 4.83261 36.0843 4.73982C35.996 4.6426 35.8568 4.59179 35.6668 4.58737C35.4944 4.58295 35.3486 4.61388 35.2293 4.68016C35.11 4.74645 35.015 4.83924 34.9443 4.95855C34.8736 5.07786 34.8228 5.21484 34.7918 5.3695L32.6045 5.38276C32.6222 4.96739 32.7327 4.60946 32.9359 4.30898C33.1392 4.0085 33.3999 3.76326 33.7181 3.57325C34.0362 3.38324 34.3831 3.24405 34.7587 3.15567C35.1387 3.06729 35.5121 3.02752 35.8789 3.03636C36.3826 3.0452 36.8378 3.15125 37.2443 3.35452C37.6552 3.55336 37.9712 3.8428 38.1921 4.22282C38.4175 4.59842 38.5036 5.05576 38.4506 5.59486L37.98 8.5378C37.9402 8.80293 37.9049 9.08573 37.874 9.38621C37.843 9.68227 37.8872 9.95845 38.0065 10.2147L37.9999 10.3407L35.8722 10.3473C35.775 10.0601 35.7264 9.76181 35.7264 9.45249C35.7264 9.14318 35.7485 8.83828 35.7927 8.5378ZM36.5019 5.95941L36.3031 7.1525L35.448 7.14587C35.2801 7.15029 35.1188 7.17901 34.9642 7.23204C34.8139 7.28064 34.6792 7.35134 34.5599 7.44414C34.4405 7.53693 34.3411 7.65182 34.2616 7.78881C34.1865 7.92579 34.1379 8.08266 34.1158 8.25941C34.0981 8.37872 34.1069 8.48698 34.1423 8.5842C34.182 8.67699 34.2417 8.75211 34.3212 8.80956C34.4052 8.867 34.509 8.89793 34.6328 8.90235C34.8228 8.90677 35.0062 8.87142 35.1829 8.7963C35.3597 8.72118 35.5121 8.61513 35.6403 8.47814C35.7728 8.34116 35.8634 8.18208 35.912 8.00091L36.2964 8.93549C36.1816 9.16527 36.049 9.37517 35.8988 9.56517C35.7529 9.75518 35.5872 9.92089 35.4016 10.0623C35.2205 10.1993 35.0172 10.3053 34.7918 10.3804C34.5665 10.4556 34.3168 10.4909 34.0429 10.4865C33.6496 10.4777 33.2872 10.3827 32.9558 10.2015C32.6244 10.0203 32.3615 9.77286 32.1671 9.45912C31.9726 9.14539 31.8821 8.78304 31.8953 8.37209C31.913 7.89486 32.0301 7.49937 32.2466 7.18564C32.4631 6.8719 32.7437 6.62666 33.0884 6.4499C33.4375 6.26873 33.8153 6.14059 34.2218 6.06547C34.6328 5.99035 35.0393 5.95279 35.4414 5.95279L36.5019 5.95941Z" fill="#E52710"/>
<path d="M28.9853 7.72941C29.025 7.52173 29.0096 7.34497 28.9389 7.19915C28.8726 7.05333 28.771 6.92961 28.634 6.82797C28.5014 6.72634 28.349 6.64017 28.1766 6.56947C28.0087 6.49435 27.8452 6.42586 27.6861 6.364C27.3415 6.22701 27.0012 6.07235 26.6654 5.90002C26.3296 5.72327 26.0247 5.51558 25.7507 5.27697C25.4767 5.03835 25.2624 4.75996 25.1078 4.44181C24.9575 4.12365 24.8935 3.75026 24.9156 3.32164C24.9465 2.83115 25.0857 2.40915 25.3331 2.05564C25.5806 1.70214 25.8965 1.41491 26.281 1.19397C26.6698 0.968611 27.0874 0.805115 27.5337 0.703482C27.9844 0.59743 28.4241 0.548823 28.8527 0.55766C29.4625 0.566498 30.006 0.690225 30.4833 0.928842C30.9649 1.16746 31.3427 1.50992 31.6167 1.95622C31.8906 2.3981 32.0232 2.93278 32.0144 3.56025H29.7674C29.7762 3.3128 29.7431 3.09848 29.668 2.91731C29.5973 2.73172 29.4802 2.58811 29.3167 2.48648C29.1532 2.38043 28.9411 2.32519 28.6804 2.32077C28.4639 2.31635 28.2473 2.3517 28.0308 2.42682C27.8143 2.49752 27.6265 2.60799 27.4674 2.75823C27.3083 2.90847 27.2067 3.1029 27.1625 3.34152C27.1316 3.52269 27.1603 3.68177 27.2487 3.81875C27.3371 3.95132 27.4586 4.06621 27.6132 4.16342C27.7679 4.25622 27.9292 4.33576 28.0971 4.40204C28.2694 4.46832 28.4197 4.52576 28.5478 4.57437C28.9102 4.71136 29.257 4.87264 29.5884 5.05823C29.9243 5.23941 30.2203 5.45372 30.4766 5.70117C30.7373 5.94863 30.9362 6.23806 31.0732 6.56947C31.2146 6.89646 31.272 7.27648 31.2455 7.70953C31.2102 8.20886 31.0776 8.63527 30.8478 8.98878C30.618 9.34228 30.322 9.62951 29.9596 9.85045C29.5973 10.0714 29.1996 10.2327 28.7665 10.3343C28.3335 10.4359 27.8938 10.4845 27.4475 10.4801C26.9482 10.4713 26.482 10.3962 26.049 10.2548C25.6159 10.1089 25.2381 9.89906 24.9156 9.62509C24.593 9.3467 24.3433 9.00645 24.1666 8.60434C23.9898 8.19781 23.9059 7.73162 23.9147 7.20578L26.1882 7.21241C26.1749 7.45986 26.1904 7.6786 26.2346 7.86861C26.2832 8.0542 26.3627 8.21106 26.4732 8.33921C26.5881 8.46294 26.7361 8.55794 26.9173 8.62422C27.0984 8.68609 27.3172 8.71702 27.5735 8.71702C27.79 8.71702 27.9977 8.68388 28.1965 8.6176C28.3998 8.5469 28.5721 8.43863 28.7135 8.29281C28.8549 8.14699 28.9455 7.95919 28.9853 7.72941Z" fill="#E52710"/>
<path d="M23.5303 3.1677L22.2908 10.3394H20.1035L21.3496 3.1677H23.5303ZM21.5418 1.35819C21.533 1.01352 21.6479 0.739553 21.8865 0.536287C22.1295 0.333021 22.4146 0.229179 22.7415 0.22476C23.0553 0.220341 23.3337 0.313137 23.5767 0.503146C23.8197 0.688737 23.9435 0.947238 23.9479 1.27865C23.9567 1.62332 23.8396 1.89729 23.5966 2.10055C23.358 2.30382 23.0752 2.40766 22.7482 2.41208C22.4344 2.4165 22.1561 2.32591 21.913 2.14032C21.6744 1.95031 21.5507 1.6896 21.5418 1.35819Z" fill="#010005"/>
<path d="M16.1928 3.16797L16.849 5.12993L18.1681 3.16797H20.5277L18.0885 6.76047L19.4009 10.3397H17.2202L16.4712 8.23194L15.0661 10.3397H12.6865L15.2516 6.56163L14.0055 3.16797H16.1928Z" fill="#010005"/>
<path d="M10.1413 8.5378L10.6053 5.55509C10.623 5.39601 10.6208 5.24356 10.5987 5.09774C10.581 4.95192 10.5258 4.83261 10.433 4.73982C10.3446 4.6426 10.2054 4.59179 10.0154 4.58737C9.84307 4.58295 9.69725 4.61388 9.57794 4.68016C9.45863 4.74645 9.36363 4.83924 9.29292 4.95855C9.22222 5.07786 9.17141 5.21484 9.14048 5.3695L6.95316 5.38276C6.97084 4.96739 7.08131 4.60946 7.28457 4.30898C7.48784 4.0085 7.74855 3.76326 8.0667 3.57325C8.38486 3.38324 8.73174 3.24405 9.10733 3.15567C9.48735 3.06729 9.86074 3.02752 10.2275 3.03636C10.7312 3.0452 11.1864 3.15125 11.5929 3.35452C12.0039 3.55336 12.3198 3.8428 12.5408 4.22282C12.7661 4.59842 12.8523 5.05576 12.7993 5.59486L12.3286 8.5378C12.2889 8.80293 12.2535 9.08573 12.2226 9.38621C12.1917 9.68227 12.2359 9.95845 12.3552 10.2147L12.3485 10.3407L10.2209 10.3473C10.1237 10.0601 10.0751 9.76181 10.0751 9.45249C10.0751 9.14318 10.0971 8.83828 10.1413 8.5378ZM10.8506 5.95941L10.6517 7.1525L9.79667 7.14587C9.62875 7.15029 9.46747 7.17901 9.31281 7.23204C9.16257 7.28064 9.0278 7.35134 8.90849 7.44414C8.78918 7.53693 8.68976 7.65182 8.61022 7.78881C8.5351 7.92579 8.48649 8.08266 8.4644 8.25941C8.44672 8.37872 8.45556 8.48698 8.49091 8.5842C8.53068 8.67699 8.59033 8.75211 8.66987 8.80956C8.75383 8.867 8.85767 8.89793 8.9814 8.90235C9.17141 8.90677 9.35479 8.87142 9.53154 8.7963C9.70829 8.72118 9.86074 8.61513 9.98889 8.47814C10.1215 8.34116 10.212 8.18208 10.2606 8.00091L10.6451 8.93549C10.5302 9.16527 10.3976 9.37517 10.2474 9.56517C10.1016 9.75518 9.93586 9.92089 9.75027 10.0623C9.5691 10.1993 9.36583 10.3053 9.14048 10.3804C8.91512 10.4556 8.66545 10.4909 8.39149 10.4865C7.99821 10.4777 7.63587 10.3827 7.30446 10.2015C6.97305 10.0203 6.71013 9.77286 6.5157 9.45912C6.32127 9.14539 6.23069 8.78304 6.24395 8.37209C6.26162 7.89486 6.37872 7.49937 6.59524 7.18564C6.81176 6.8719 7.09236 6.62666 7.43702 6.4499C7.78611 6.26873 8.16392 6.14059 8.57045 6.06547C8.9814 5.99035 9.38793 5.95279 9.79004 5.95279L10.8506 5.95941Z" fill="#010005"/>
<path d="M5.33571 0.689453L3.6654 10.3402H1.39193L3.06886 0.689453H5.33571ZM8.15271 0.689453L7.84118 2.48571H0L0.318154 0.689453H8.15271Z" fill="#010005"/>
</svg>

        </div>
        <div class="footer-website">www.taxisafar.com</div>
      </div>
    </div>
  </body>
</html>`;
};

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
      terms_and_conditions:
        "You acknowledge and agree to accept all terms and conditions of the driver as applicable to this trip.",
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

        subtotal: parseFloat(summaryReq.subtotal) || kmFare + dayFare,

        grand_total: grandTotal,
        total: grandTotal,
        amount_in_words: amountInWords,
      },

      show_bank_details: req.body.show_bank_details || false,
      bank_details: req.body.show_bank_details ? req.body.bank_details : null,

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
const c = {
  company_id: {
    _id: "test-company-001",
    company_name: "Test Cab Service",
    gst_no: "27ABCDE1234F1Z5",
    driverPub: "DRV-TEST-001",
    address: "Test Address, Test City, India",
    phone: "9999999999",
    email: "testcab@example.com",
    logo: {
      url: "https://dummyimage.com/200x100/000/fff&text=Logo",
      publicId: "test/logo",
    },
    signature: {
      url: "https://dummyimage.com/200x80/000/fff&text=Sign",
      publicId: "test/signature",
    },
    rating: "5.0",
    successfulRides: 10,
    totalRatings: 10,
    CancelRides: 0,
  },
};

const q = {
  bill_to: {
    customer_name: "Akash Sharma",
    contact_number: "8433073477",
    email: "akash@gmail.com",
    address: "Pune, Maharashtra, India",
  },

  summary: {
    toll_tax_total: 300,
    state_tax: 0,
    driver_charge: 400,
    parking_charge: 200,
    extra_charges_total: 0,
    additional_charges: [
      { title: "Night Charge", amount: 500 },
      { title: "Hill Charge", amount: 800 },
      { title: "Guide Fee", amount: 0 },
    ],
    discount: 0,
    gst_applied: false,
    gst_amount: 0,
    subtotal: 4000,
    grand_total: 5000,
    total: 5000,
    amount_in_words: "Five Thousand Only",
  },

  bank_details: {
    bank_name: "HDFC Bank",
    account_number: "50100252648154",
    ifsc_code: "HDFC0003696",
    account_holder_name: "Lokesh Cab Service",
  },

  company_id: {
    _id: "test-company-001",
    company_name: "Lokesh Cab Service",
    address: "Sector 16A, Sikandra, Agra, UP",
    phone: "7533842003",
    email: "lokeshcab@gmail.com",
    logo: {
      url: "https://dummyimage.com/200x100/000/fff&text=Logo",
      publicId: "test/logo",
    },
    signature: {
      url: "https://dummyimage.com/200x80/000/fff&text=Sign",
      publicId: "test/signature",
    },
  },

  invoice_number: "LC20250102001",
  invoice_date: "2025-01-02T09:00:00.000Z",
  document_type: "quotation",
  trip_type: "one_way",

  trip_details: [
    {
      sn: 1,
      pickup_drop_place: "Agra Cantt → Vrindavan",
      vehicle_type: "Ertiga",
      pickup_date: "2025-01-05T00:00:00.000Z",
      pickup_time: "07:00 AM",
      return_date: "2025-01-05T00:00:00.000Z",
      return_time: "08:30 PM",
      pricing_mode: "km_wise",
      total_km: "1000",
      per_km_rate: "10",
      km_fare: "10000",
      total_days: 1,
      per_day_cab_charges: 4000,
      day_fare: 4000,
      toll_tax_amount: 300,

      /* 👇 STOPS USED BY YOUR CODE */
      multi_stops: true,
      stops: [{ place: "Mathura" }, { place: "Gokul" }, { place: "Govardhan" }],

      total_amount: 4300,
    },
  ],

  place_of_supply: "Uttar Pradesh",
  status: "draft",
};

// Fixed: Pass c.company_id instead of c.company
// const html = generateHTMLTemplate(q, c.company_id);
console.log("HTML generated successfully!");
// console.log(html);
