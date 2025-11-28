// src/data/menu.js
export const menuItems = [
  {
    title: "Dashboard",
    icon: "mdi:car-outline",
    submenu: [
      { label: "Overview", path: "/" },
      { label: "Ride Analytics", path: "/analytics" },
      { label: "Driver Performance", path: "/drivers/performance" },
      { label: "Revenue Reports", path: "/revenue" },
      { label: "Live Tracking", path: "/tracking" },
    ],
  },
  {
    group: "Booking Management",
  },
  {
    title: "Bookings",
    icon: "mdi:calendar-clock",
    submenu: [
      { label: "All Bookings", path: "/bookings" },
      { label: "Active Rides", path: "/bookings/active" },
      { label: "New Booking", path: "/bookings/new" },
    ],
  },
  {
    title: "Drivers",
    icon: "mdi:steering",
    submenu: [
      { label: "All Drivers", path: "/drivers" },
      { label: "Add Driver", path: "/drivers/add" },
      { label: "Driver Earnings", path: "/drivers/earnings" },
    ],
  },
  {
    group: "Fleet & Operations",
  },
  {
    title: "Vehicles",
    icon: "mdi:car-multiple",
    submenu: [
      { label: "All Vehicles", path: "/vehicles" },
      { label: "Add Vehicle", path: "/vehicles/add" },
    ],
  },
  {
    group: "System Settings",
  },
  {
    title: "Settings",
    icon: "icon-park-outline:setting-two",
    submenu: [
      { label: "Company", path: "/settings/company" },
      { label: "Payment Gateway", path: "/settings/payment" },
    ],
  },
  {
    title: "Pricing Plans",
    icon: "hugeicons:money-send-square",
    path: "/pricing",
  },
  {
    title: "FAQs",
    icon: "mage:message-question-mark-round",
    path: "/faq",
  },
];