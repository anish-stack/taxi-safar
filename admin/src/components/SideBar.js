import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const SideBar = ({ open, close }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const location = useLocation();

  const toggleMenu = (key) => {
    setOpenMenu(prev => (prev === key ? null : key));
  };

  // Auto-open parent menu based on current path
  useEffect(() => {
    const path = location.pathname;

    const menuMap = {
      bookings: ['/bookings', '/booking'],
      appcategories: ['/appcategories', '/appcategory', '/border-tax-pays', '/buy-insurances', '/driver-jobs', '/quotations', '/buy-sell-taxi'],
      drivers: ['/drivers', '/driver'],
      vehicles: ['/vehicles', '/vehicle'],
      payments: ['/transactions', '/payments', '/refunds', '/driver/payouts', '/invoices', '/payment'],
      pricing: ['/fare-management', '/surge-pricing', '/discount-coupons', '/promo-codes', '/package-deals', '/airport-rates'],
      support: ['/support', '/complaints', '/feedback', '/sos-alerts'],
      notifications: ['/notifications'],
    };

    const activeMenu = Object.keys(menuMap).find(key =>
      menuMap[key].some(p => path.startsWith(p))
    );

    setOpenMenu(activeMenu || null);
  }, [location.pathname]);

  // Helper: Check if any of the paths match (for parent active state)
  const isActive = (paths) => {
    if (Array.isArray(paths)) {
      return paths.some(p => location.pathname.startsWith(p));
    }
    return location.pathname === paths || location.pathname.startsWith(paths + '/');
  };

  // Exact match for submenu items
  const isExactActive = (path) => location.pathname === path;

  return (
    <aside className={`sidebar ${open ? 'open-side' : 'close-side'}`}>
      <button onClick={close} type="button" className="sidebar-close-btn">
        <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
      </button>

      <div>
        <Link to="/" className="sidebar-logo">
          <img src={process.env.PUBLIC_URL + "/images/logo-light.png"} alt="logo" />
        </Link>
      </div>

      <div className="sidebar-menu-area">
        <ul className="sidebar-menu" id="sidebar-menu">

          {/* Dashboard */}
          <li className={location.pathname === '/' ? 'active' : ''}>
            <Link to="/">
              <iconify-icon icon="mdi:car-outline" className="menu-icon"></iconify-icon>
              <span>Dashboard</span>
            </Link>
          </li>

          <li className="sidebar-menu-group-title">Booking Management</li>

          {/* Bookings */}
          <li className={`dropdown ${isActive(['/bookings', '/booking']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/bookings', '/booking']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('bookings'); }}
            >
              <iconify-icon icon="mdi:calendar-clock" className="menu-icon"></iconify-icon>
              <span>Bookings</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'bookings' ? 'show' : ''}`}>
              <li className={isExactActive('/bookings/all') ? 'active' : ''}>
                <Link to="/bookings/all"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> All Bookings</Link>
              </li>
              <li className={isExactActive('/bookings/scheduled') ? 'active' : ''}>
                <Link to="/bookings/scheduled"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Scheduled Rides</Link>
              </li>
              <li className={isExactActive('/bookings/post-rides') ? 'active' : ''}>
                <Link to="/bookings/post-rides"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Driver Post Rides</Link>
              </li>
            </ul>
          </li>

          {/* Drivers */}
          <li className={`dropdown ${isActive(['/drivers', '/driver']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/drivers', '/driver']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('drivers'); }}
            >
              <iconify-icon icon="mdi:steering" className="menu-icon"></iconify-icon>
              <span>Drivers</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'drivers' ? 'show' : ''}`}>
              <li className={isExactActive('/drivers/all') ? 'active' : ''}>
                <Link to="/drivers/all"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> All Drivers</Link>
              </li>
              <li className={isExactActive('/driver/add') ? 'active' : ''}>
                <Link to="/driver/add"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Add Driver</Link>
              </li>
            </ul>
          </li>

          {/* App Categories Management */}
          <li className="sidebar-menu-group-title">App Categories Management</li>

          <li className={`dropdown ${isActive([
            '/appcategories', '/appcategory', '/border-tax-pays', '/buy-insurances',
            '/driver-jobs', '/quotations', '/buy-sell-taxi'
          ]) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive([
                '/appcategories', '/appcategory', '/border-tax-pays', '/buy-insurances',
                '/driver-jobs', '/quotations', '/buy-sell-taxi'
              ]) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('appcategories'); }}
            >
              <iconify-icon icon="mdi:apps" className="menu-icon"></iconify-icon>
              <span>App Categories</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'appcategories' ? 'show' : ''}`}>
              <li className={isExactActive('/appcategories/all') ? 'active' : ''}>
                <Link to="/appcategories/all">
                  <i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> All Categories
                </Link>
              </li>
              <li className={isExactActive('/border-tax-pays') ? 'active' : ''}>
                <Link to="/border-tax-pays">
                  <i className="ri-circle-fill circle-icon text-warning-main w-auto"></i> Border Tax Pays
                </Link>
              </li>
              <li className={isExactActive('/buy-insurances') ? 'active' : ''}>
                <Link to="/buy-insurances">
                  <i className="ri-circle-fill circle-icon text-success-main w-auto"></i> Buy Insurances
                </Link>
              </li>
              <li className={isExactActive('/driver-jobs') ? 'active' : ''}>
                <Link to="/driver-jobs">
                  <i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Driver Jobs
                </Link>
              </li>
              <li className={isExactActive('/quotations') ? 'active' : ''}>
                <Link to="/quotations">
                  <i className="ri-circle-fill circle-icon text-purple w-auto"></i> Quotations
                </Link>
              </li>
              <li className={isExactActive('/buy-sell-taxi') ? 'active' : ''}>
                <Link to="/buy-sell-taxi">
                  <i className="ri-circle-fill circle-icon text-danger-main w-auto"></i> Buy Sell Taxi
                </Link>
              </li>
            </ul>
          </li>

          <li className="sidebar-menu-group-title">Fleet & Operations</li>

          {/* Vehicles */}
          <li className={`dropdown ${isActive(['/vehicles', '/vehicle']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/vehicles', '/vehicle']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('vehicles'); }}
            >
              <iconify-icon icon="mdi:car-multiple" className="menu-icon"></iconify-icon>
              <span>Vehicles</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'vehicles' ? 'show' : ''}`}>
              <li className={isExactActive('/vehicles/all') ? 'active' : ''}>
                <Link to="/vehicles/all"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> All Vehicles</Link>
              </li>
              <li className={isExactActive('/vehicle/add') ? 'active' : ''}>
                <Link to="/vehicle/add"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Add Vehicle</Link>
              </li>
            </ul>
          </li>

          {/* Payments */}
          <li className={`dropdown ${isActive(['/transactions', '/payments', '/refunds', '/driver/payouts', '/invoices', '/payment']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/transactions', '/payments', '/refunds', '/driver/payouts', '/invoices', '/payment']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('payments'); }}
            >
              <iconify-icon icon="mdi:cash-multiple" className="menu-icon"></iconify-icon>
              <span>Payments</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'payments' ? 'show' : ''}`}>
              <li className={isExactActive('/transactions/all') ? 'active' : ''}><Link to="/transactions/all"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> All Transactions</Link></li>
              <li className={isExactActive('/payments/pending') ? 'active' : ''}><Link to="/payments/pending"><i className="ri-circle-fill circle-icon text-warning-main w-auto"></i> Pending Payments</Link></li>
              <li className={isExactActive('/payments/completed') ? 'active' : ''}><Link to="/payments/completed"><i className="ri-circle-fill circle-icon text-success-main w-auto"></i> Completed Payments</Link></li>
              <li className={isExactActive('/refunds') ? 'active' : ''}><Link to="/refunds"><i className="ri-circle-fill circle-icon text-danger-main w-auto"></i> Refunds</Link></li>
              <li className={isExactActive('/driver/payouts') ? 'active' : ''}><Link to="/driver/payouts"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Driver Payouts</Link></li>
              <li className={isExactActive('/payment/methods') ? 'active' : ''}><Link to="/payment/methods"><i className="ri-circle-fill circle-icon text-purple w-auto"></i> Payment Methods</Link></li>
              <li className={isExactActive('/invoices') ? 'active' : ''}><Link to="/invoices"><i className="ri-circle-fill circle-icon text-cyan w-auto"></i> Invoices</Link></li>
              <li className={isExactActive('/payment/reports') ? 'active' : ''}><Link to="/payment/reports"><i className="ri-circle-fill circle-icon text-indigo w-auto"></i> Payment Reports</Link></li>
            </ul>
          </li>

          {/* Pricing */}
          <li className={`dropdown ${isActive(['/fare-management', '/surge-pricing', '/discount-coupons', '/promo-codes', '/package-deals', '/airport-rates']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/fare-management', '/surge-pricing', '/discount-coupons', '/promo-codes', '/package-deals', '/airport-rates']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('pricing'); }}
            >
              <iconify-icon icon="mdi:tag-multiple" className="menu-icon"></iconify-icon>
              <span>Pricing</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'pricing' ? 'show' : ''}`}>
              <li className={isExactActive('/fare-management') ? 'active' : ''}><Link to="/fare-management"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> Fare Management</Link></li>
              <li className={isExactActive('/surge-pricing') ? 'active' : ''}><Link to="/surge-pricing"><i className="ri-circle-fill circle-icon text-warning-main w-auto"></i> Surge Pricing</Link></li>
              <li className={isExactActive('/discount-coupons') ? 'active' : ''}><Link to="/discount-coupons"><i className="ri-circle-fill circle-icon text-success-main w-auto"></i> Discount Coupons</Link></li>
              <li className={isExactActive('/promo-codes') ? 'active' : ''}><Link to="/promo-codes"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Promo Codes</Link></li>
              <li className={isExactActive('/package-deals') ? 'active' : ''}><Link to="/package-deals"><i className="ri-circle-fill circle-icon text-danger-main w-auto"></i> Package Deals</Link></li>
              <li className={isExactActive('/airport-rates') ? 'active' : ''}><Link to="/airport-rates"><i className="ri-circle-fill circle-icon text-purple w-auto"></i> Airport Rates</Link></li>
            </ul>
          </li>

          <li className="sidebar-menu-group-title">Support & Reports</li>

          {/* Support */}
          <li className={`dropdown ${isActive(['/support', '/complaints', '/feedback', '/sos-alerts']) ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive(['/support', '/complaints', '/feedback', '/sos-alerts']) ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('support'); }}
            >
              <iconify-icon icon="mdi:headset" className="menu-icon"></iconify-icon>
              <span>Support</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'support' ? 'show' : ''}`}>
              <li className={isExactActive('/support/tickets') ? 'active' : ''}><Link to="/support/tickets"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> Support Tickets</Link></li>
              <li className={isExactActive('/complaints') ? 'active' : ''}><Link to="/complaints"><i className="ri-circle-fill circle-icon text-danger-main w-auto"></i> Complaints</Link></li>
              <li className={isExactActive('/feedback') ? 'active' : ''}><Link to="/feedback"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Feedback</Link></li>
              <li className={isExactActive('/sos-alerts') ? 'active' : ''}><Link to="/sos-alerts"><i className="ri-circle-fill circle-icon text-warning-main w-auto"></i> SOS Alerts</Link></li>
            </ul>
          </li>

          {/* Notifications */}
          <li className={`dropdown ${isActive('/notifications') ? 'active' : ''}`}>
            <Link
              to="#"
              className={isActive('/notifications') ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); toggleMenu('notifications'); }}
            >
              <iconify-icon icon="mdi:bell-alert" className="menu-icon"></iconify-icon>
              <span>Notifications</span>
            </Link>
            <ul className={`sidebar-submenu ${openMenu === 'notifications' ? 'show' : ''}`}>
              <li className={isExactActive('/notifications/push') ? 'active' : ''}><Link to="/notifications/push"><i className="ri-circle-fill circle-icon text-primary-600 w-auto"></i> Push Notifications</Link></li>
              <li className={isExactActive('/notifications/email') ? 'active' : ''}><Link to="/notifications/email"><i className="ri-circle-fill circle-icon text-info-main w-auto"></i> Email Notifications</Link></li>
              <li className={isExactActive('/notifications/sms') ? 'active' : ''}><Link to="/notifications/sms"><i className="ri-circle-fill circle-icon text-success-main w-auto"></i> SMS Notifications</Link></li>
              <li className={isExactActive('/notifications/templates') ? 'active' : ''}><Link to="/notifications/templates"><i className="ri-circle-fill circle-icon text-warning-main w-auto"></i> Notification Templates</Link></li>
            </ul>
          </li>

          <li className="sidebar-menu-group-title">System Settings</li>

          <li className={isActive('/users') ? 'active' : ''}>
            <Link to="/users">
              <iconify-icon icon="flowbite:users-group-outline" className="menu-icon"></iconify-icon>
              <span>Users</span>
            </Link>
          </li>

          <li className={isActive('/settings') ? 'active' : ''}>
            <Link to="/settings">
              <iconify-icon icon="icon-park-outline:setting-two" className="menu-icon"></iconify-icon>
              <span>Settings</span>
            </Link>
          </li>

          <li className={isActive('/pricing') ? 'active' : ''}>
            <Link to="/pricing">
              <iconify-icon icon="hugeicons:money-send-square" className="menu-icon"></iconify-icon>
              <span>Pricing Plans</span>
            </Link>
          </li>

          <li className={isActive('/faq') ? 'active' : ''}>
            <Link to="/faq">
              <iconify-icon icon="mage:message-question-mark-round" className="menu-icon"></iconify-icon>
              <span>FAQs</span>
            </Link>
          </li>

          <li className={isActive('/terms-condition') ? 'active' : ''}>
            <Link to="/terms-condition">
              <iconify-icon icon="octicon:info-24" className="menu-icon"></iconify-icon>
              <span>Terms & Conditions</span>
            </Link>
          </li>

        </ul>
      </div>
    </aside>
  );
};

export default SideBar;