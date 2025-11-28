import React from 'react';
import { Outlet } from 'react-router-dom';
import SideBar from '../../components/SideBar'
import { useState } from 'react';
import Overview from '../Dashboard/Overview';

export const Home = () => {
  const [open, setOpen] = useState(false);
  const toggleSidebar = () => {
    setOpen(!open);
  };
  return (
    <div className="dashboard-main">
      <SideBar open={open} close={toggleSidebar} />

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Navbar Header */}
        <header className="navbar-header">
          <div className="row align-items-center justify-content-between">
            {/* Left Side - Search & Toggle */}
            <div className="col-auto">
              <div className="d-flex flex-wrap align-items-center gap-4">
                {/* Desktop Sidebar Toggle */}
                <button onClick={toggleSidebar} type="button" className="sidebar-toggle">
                  <iconify-icon icon="heroicons:bars-3-solid" className="icon text-2xl non-active"></iconify-icon>
                </button>

                <button onClick={toggleSidebar} type="button" className="sidebar-mobile-toggle">
                  <iconify-icon icon="heroicons:bars-3-solid" className="icon"></iconify-icon>
                </button>

              </div>
            </div>

            {/* Right Side - Icons & Profile */}
            <div className="col-auto">
              <div className="d-flex flex-wrap align-items-center gap-3">


                {/* Messages Dropdown */}
                <div className="dropdown">
                  <button
                    className="has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    <iconify-icon icon="mage:email" className="text-primary-light text-xl"></iconify-icon>
                    <span className="w-16-px h-16-px bg-danger rounded-circle position-absolute top-0 end-0 d-flex justify-content-center align-items-center text-white text-xs">5</span>
                  </button>
                  <div className="dropdown-menu to-top dropdown-menu-lg p-0">
                    <div className="m-16 py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                      <h6 className="text-lg text-primary-light fw-semibold mb-0">Messages</h6>
                      <span className="text-primary-600 fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center">05</span>
                    </div>
                    <div className="max-h-400-px overflow-y-auto scroll-sm pe-4">
                      {/* Example message items */}
                      {[
                        { name: 'Kathryn Murphy', img: 'profile-3.png', time: '12:30 PM', unread: 8, online: true },
                        { name: 'Robiul Hasan', img: 'profile-4.png', time: '12:30 PM', unread: 2, online: false },
                      ].map((msg) => (
                        <a key={msg.name} href="#" className="px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between hover-bg-transparent">
                          <div className="d-flex align-items-center gap-3">
                            <span className="position-relative">
                              <img src={`images/${msg.img}`} alt={msg.name} className="w-40-px h-40-px rounded-circle" />
                              <span className={`w-8-px h-8-px rounded-circle position-absolute end-0 bottom-0 ${msg.online ? 'bg-success-main' : 'bg-neutral-300'}`}></span>
                            </span>
                            <div>
                              <h6 className="text-md fw-semibold mb-1">{msg.name}</h6>
                              <p className="mb-0 text-sm text-secondary-light">hey! there i’m...</p>
                            </div>
                          </div>
                          <div className="d-flex flex-column align-items-end">
                            <span className="text-sm text-secondary-light">{msg.time}</span>
                            {msg.unread > 0 && (
                              <span className="mt-4 text-xs text-white w-16-px h-16-px d-flex justify-content-center align-items-center bg-warning-main rounded-circle">
                                {msg.unread}
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                    <div className="text-center py-12 px-16">
                      <a href="#" className="text-primary-600 fw-semibold text-md">See All Messages</a>
                    </div>
                  </div>
                </div>

                {/* Notifications Dropdown */}
                <div className="dropdown">
                  <button
                    className="has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    <iconify-icon icon="iconoir:bell" className="text-primary-light text-xl"></iconify-icon>
                    <span className="w-16-px h-16-px bg-danger rounded-circle position-absolute top-0 end-0 d-flex justify-content-center align-items-center text-white text-xs">5</span>
                  </button>
                  <div className="dropdown-menu to-top dropdown-menu-lg p-0">
                    <div className="m-16 py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                      <h6 className="text-lg text-primary-light fw-semibold mb-0">Notifications</h6>
                      <span className="text-primary-600 fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center">05</span>
                    </div>
                    <div className="max-h-400-px overflow-y-auto scroll-sm pe-4">
                      {/* Notification items */}
                      <a href="#" className="px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <span className="w-44-px h-44-px bg-success-subtle text-success-main rounded-circle d-flex justify-content-center align-items-center">
                            <iconify-icon icon="bitcoin-icons:verify-outline" className="icon text-xxl"></iconify-icon>
                          </span>
                          <div>
                            <h6 className="text-md fw-semibold mb-1">Congratulations!</h6>
                            <p className="mb-0 text-sm text-secondary-light">Your profile has been verified.</p>
                          </div>
                        </div>
                        <span className="text-sm text-secondary-light">23 mins ago</span>
                      </a>
                    </div>
                    <div className="text-center py-12 px-16">
                      <a href="#" className="text-primary-600 fw-semibold text-md">See All Notifications</a>
                    </div>
                  </div>
                </div>

                {/* User Profile Dropdown */}
                <div className="dropdown">
                  <button
                    className="d-flex justify-content-center align-items-center rounded-circle border-0 p-0"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    <img src="images/user.png" alt="User" className="w-40-px h-40-px object-fit-cover rounded-circle" />
                  </button>
                  <div className="dropdown-menu to-top dropdown-menu-sm">
                    <div className="py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2">
                      <div>
                        <h6 className="text-lg text-primary-light fw-semibold mb-2">Robiul Hasan</h6>
                        <span className="text-secondary-light fw-medium text-sm">Admin</span>
                      </div>
                    </div>
                    <ul className="to-top-list">
                      <li><a className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3" href="/profile">
                        <iconify-icon icon="solar:user-linear" className="icon text-xl"></iconify-icon> My Profile
                      </a></li>
                      <li><a className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3" href="/inbox">
                        <iconify-icon icon="tabler:message-check" className="icon text-xl"></iconify-icon> Inbox
                      </a></li>
                      <li><a className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3" href="/settings">
                        <iconify-icon icon="icon-park-outline:setting-two" className="icon text-xl"></iconify-icon> Settings
                      </a></li>
                      <li><a className="dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3" href="/logout">
                        <iconify-icon icon="lucide:power" className="icon text-xl"></iconify-icon> Log Out
                      </a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>




      <footer class="d-footer">
        <div class="row align-items-center justify-content-between">
          <div class="col-auto">
<p class="mb-0">
  © <span id="year">2025</span> Taxi Safar. All Rights Reserved.
</p>
          </div>
          <div class="col-auto">
            <p class="mb-0">Made by <span class="text-primary-600">Anish Jha .</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;