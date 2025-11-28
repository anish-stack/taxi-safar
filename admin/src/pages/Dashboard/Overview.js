import React from 'react';

export const Overview = () => {
  return (
      <div className="dashboard-main-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
          <h6 className="fw-semibold mb-0">Dashboard</h6>
          <ul className="d-flex align-items-center gap-2">
            <li className="fw-medium">
              <a
                href="index.html"
                className="d-flex align-items-center gap-1 hover-text-primary"
              >
                <iconify-icon
                  icon="solar:home-smile-angle-outline"
                  className="icon text-lg"
                />
                Dashboard
              </a>
            </li>
            <li>-</li>
            <li className="fw-medium">AI</li>
          </ul>
        </div>
        <div className="row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4">
          <div className="col">
            <div className="card shadow-none border bg-gradient-start-1 h-100">
              <div className="card-body p-20">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <p className="fw-medium text-primary-light mb-1">Total Users</p>
                    <h6 className="mb-0">20,000</h6>
                  </div>
                  <div className="w-50-px h-50-px bg-cyan rounded-circle d-flex justify-content-center align-items-center">
                    <iconify-icon
                      icon="gridicons:multiple-users"
                      className="text-white text-2xl mb-0"
                    />
                  </div>
                </div>
                <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                  <span className="d-inline-flex align-items-center gap-1 text-success-main">
                    <iconify-icon icon="bxs:up-arrow" className="text-xs" /> +5000
                  </span>
                  Last 30 days users
                </p>
              </div>
            </div>
            {/* card end */}
          </div>
          <div className="col">
            <div className="card shadow-none border bg-gradient-start-2 h-100">
              <div className="card-body p-20">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <p className="fw-medium text-primary-light mb-1">
                      Total Subscription
                    </p>
                    <h6 className="mb-0">15,000</h6>
                  </div>
                  <div className="w-50-px h-50-px bg-purple rounded-circle d-flex justify-content-center align-items-center">
                    <iconify-icon
                      icon="fa-solid:award"
                      className="text-white text-2xl mb-0"
                    />
                  </div>
                </div>
                <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                  <span className="d-inline-flex align-items-center gap-1 text-danger-main">
                    <iconify-icon icon="bxs:down-arrow" className="text-xs" /> -800
                  </span>
                  Last 30 days subscription
                </p>
              </div>
            </div>
            {/* card end */}
          </div>
          <div className="col">
            <div className="card shadow-none border bg-gradient-start-3 h-100">
              <div className="card-body p-20">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <p className="fw-medium text-primary-light mb-1">
                      Total Free Users
                    </p>
                    <h6 className="mb-0">5,000</h6>
                  </div>
                  <div className="w-50-px h-50-px bg-info rounded-circle d-flex justify-content-center align-items-center">
                    <iconify-icon
                      icon="fluent:people-20-filled"
                      className="text-white text-2xl mb-0"
                    />
                  </div>
                </div>
                <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                  <span className="d-inline-flex align-items-center gap-1 text-success-main">
                    <iconify-icon icon="bxs:up-arrow" className="text-xs" /> +200
                  </span>
                  Last 30 days users
                </p>
              </div>
            </div>
            {/* card end */}
          </div>
          <div className="col">
            <div className="card shadow-none border bg-gradient-start-4 h-100">
              <div className="card-body p-20">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <p className="fw-medium text-primary-light mb-1">Total Income</p>
                    <h6 className="mb-0">$42,000</h6>
                  </div>
                  <div className="w-50-px h-50-px bg-success-main rounded-circle d-flex justify-content-center align-items-center">
                    <iconify-icon
                      icon="solar:wallet-bold"
                      className="text-white text-2xl mb-0"
                    />
                  </div>
                </div>
                <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                  <span className="d-inline-flex align-items-center gap-1 text-success-main">
                    <iconify-icon icon="bxs:up-arrow" className="text-xs" /> +$20,000
                  </span>
                  Last 30 days income
                </p>
              </div>
            </div>
            {/* card end */}
          </div>
          <div className="col">
            <div className="card shadow-none border bg-gradient-start-5 h-100">
              <div className="card-body p-20">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <p className="fw-medium text-primary-light mb-1">Total Expense</p>
                    <h6 className="mb-0">$30,000</h6>
                  </div>
                  <div className="w-50-px h-50-px bg-red rounded-circle d-flex justify-content-center align-items-center">
                    <iconify-icon
                      icon="fa6-solid:file-invoice-dollar"
                      className="text-white text-2xl mb-0"
                    />
                  </div>
                </div>
                <p className="fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2">
                  <span className="d-inline-flex align-items-center gap-1 text-success-main">
                    <iconify-icon icon="bxs:up-arrow" className="text-xs" /> +$5,000
                  </span>
                  Last 30 days expense
                </p>
              </div>
            </div>
            {/* card end */}
          </div>
        </div>
        <div className="row gy-4 mt-1">
          <div className="col-xxl-6 col-xl-12">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center justify-content-between">
                  <h6 className="text-lg mb-0">Sales Statistic</h6>
                  <select className="form-select bg-base form-select-sm w-auto radius-8">
                    <option>Yearly</option>
                    <option>Monthly</option>
                    <option>Weekly</option>
                    <option>Today</option>
                  </select>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2 mt-8">
                  <h6 className="mb-0">$27,200</h6>
                  <span className="text-sm fw-semibold rounded-pill bg-success-focus text-success-main border br-success px-8 py-4 line-height-1 d-flex align-items-center gap-1">
                    10% <iconify-icon icon="bxs:up-arrow" className="text-xs" />
                  </span>
                  <span className="text-xs fw-medium">+ $1500 Per Day</span>
                </div>
                <div id="chart" className="pt-28 apexcharts-tooltip-style-1" />
              </div>
            </div>
          </div>
          <div className="col-xxl-3 col-xl-6">
            <div className="card h-100 radius-8 border">
              <div className="card-body p-24">
                <h6 className="mb-12 fw-semibold text-lg mb-16">Total Subscriber</h6>
                <div className="d-flex align-items-center gap-2 mb-20">
                  <h6 className="fw-semibold mb-0">5,000</h6>
                  <p className="text-sm mb-0">
                    <span className="bg-danger-focus border br-danger px-8 py-2 rounded-pill fw-semibold text-danger-main text-sm d-inline-flex align-items-center gap-1">
                      10%
                      <iconify-icon
                        icon="iconamoon:arrow-down-2-fill"
                        className="icon"
                      />
                    </span>
                    - 20 Per Day
                  </p>
                </div>
                <div id="barChart" className="barChart" />
              </div>
            </div>
          </div>
          <div className="col-xxl-3 col-xl-6">
            <div className="card h-100 radius-8 border-0 overflow-hidden">
              <div className="card-body p-24">
                <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                  <h6 className="mb-2 fw-bold text-lg">Users Overview</h6>
                  <div className="">
                    <select className="form-select form-select-sm w-auto bg-base border text-secondary-light radius-8">
                      <option>Today</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Yearly</option>
                    </select>
                  </div>
                </div>
                <div
                  id="userOverviewDonutChart"
                  className="apexcharts-tooltip-z-none"
                />
                <ul className="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-3">
                  <li className="d-flex align-items-center gap-2">
                    <span className="w-12-px h-12-px radius-2 bg-primary-600" />
                    <span className="text-secondary-light text-sm fw-normal">
                      New:
                      <span className="text-primary-light fw-semibold">500</span>
                    </span>
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <span className="w-12-px h-12-px radius-2 bg-yellow" />
                    <span className="text-secondary-light text-sm fw-normal">
                      Subscribed:
                      <span className="text-primary-light fw-semibold">300</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xxl-9 col-xl-12">
            <div className="card h-100">
              <div className="card-body p-24">
                <div className="d-flex flex-wrap align-items-center gap-1 justify-content-between mb-16">
                  <ul
                    className="nav border-gradient-tab nav-pills mb-0"
                    id="pills-tab"
                    role="tablist"
                  >
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link d-flex align-items-center active"
                        id="pills-to-do-list-tab"
                        data-bs-toggle="pill"
                        data-bs-target="#pills-to-do-list"
                        type="button"
                        role="tab"
                        aria-controls="pills-to-do-list"
                        aria-selected="true"
                      >
                        Latest Registered
                        <span className="text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert">
                          35
                        </span>
                      </button>
                    </li>
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link d-flex align-items-center"
                        id="pills-recent-leads-tab"
                        data-bs-toggle="pill"
                        data-bs-target="#pills-recent-leads"
                        type="button"
                        role="tab"
                        aria-controls="pills-recent-leads"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Latest Subscribe
                        <span className="text-sm fw-semibold py-6 px-12 bg-neutral-500 rounded-pill text-white line-height-1 ms-12 notification-alert">
                          35
                        </span>
                      </button>
                    </li>
                  </ul>
                  <a
                    href="javascript:void(0)"
                    className="text-primary-600 hover-text-primary d-flex align-items-center gap-1"
                  >
                    View All
                    <iconify-icon
                      icon="solar:alt-arrow-right-linear"
                      className="icon"
                    />
                  </a>
                </div>
                <div className="tab-content" id="pills-tabContent">
                  <div
                    className="tab-pane fade show active"
                    id="pills-to-do-list"
                    role="tabpanel"
                    aria-labelledby="pills-to-do-list-tab"
                    tabIndex={0}
                  >
                    <div className="table-responsive scroll-sm">
                      <table className="table bordered-table sm-table mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Users </th>
                            <th scope="col">Registered On</th>
                            <th scope="col">Plan</th>
                            <th scope="col" className="text-center">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user1.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Dianne Russell
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    redaniel@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Free</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user2.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Wade Warren
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    xterris@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Basic</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user3.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Albert Flores
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    seannand@mail.ru
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Standard</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user4.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Bessie Cooper{" "}
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    igerrin@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Business</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user5.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Arlene McCoy
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    fellora@mail.ru
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Enterprise </td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div
                    className="tab-pane fade"
                    id="pills-recent-leads"
                    role="tabpanel"
                    aria-labelledby="pills-recent-leads-tab"
                    tabIndex={0}
                  >
                    <div className="table-responsive scroll-sm">
                      <table className="table bordered-table sm-table mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Users </th>
                            <th scope="col">Registered On</th>
                            <th scope="col">Plan</th>
                            <th scope="col" className="text-center">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user1.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Dianne Russell
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    redaniel@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Free</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user2.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Wade Warren
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    xterris@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Basic</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user3.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Albert Flores
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    seannand@mail.ru
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Standard</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user4.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Bessie Cooper{" "}
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    igerrin@gmail.com
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Business</td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src="images/user5.png"
                                  alt="Image"
                                  className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                                />
                                <div className="flex-grow-1">
                                  <h6 className="text-md mb-0 fw-medium">
                                    Arlene McCoy
                                  </h6>
                                  <span className="text-sm text-secondary-light fw-medium">
                                    fellora@mail.ru
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>27 Mar 2024</td>
                            <td>Enterprise </td>
                            <td className="text-center">
                              <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                                Active
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xxl-3 col-xl-12">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                  <h6 className="mb-2 fw-bold text-lg mb-0">Top Performer</h6>
                  <a
                    href="javascript:void(0)"
                    className="text-primary-600 hover-text-primary d-flex align-items-center gap-1"
                  >
                    View All
                    <iconify-icon
                      icon="solar:alt-arrow-right-linear"
                      className="icon"
                    />
                  </a>
                </div>
                <div className="mt-32">
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user1.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Dianne Russell</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$20</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user2.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Wade Warren</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$20</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user3.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Albert Flores</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$30</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user4.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Bessie Cooper</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$40</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3 mb-24">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user5.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Arlene McCoy</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$10</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center">
                      <img
                        src="images/user1.png"
                        alt="Image"
                        className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden"
                      />
                      <div className="flex-grow-1">
                        <h6 className="text-md mb-0 fw-medium">Arlene McCoy</h6>
                        <span className="text-sm text-secondary-light fw-medium">
                          Agent ID: 36254
                        </span>
                      </div>
                    </div>
                    <span className="text-primary-light text-md fw-medium">$10</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xxl-6 col-xl-12">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                  <h6 className="mb-2 fw-bold text-lg mb-0">Top Countries</h6>
                  <select className="form-select form-select-sm w-auto bg-base border text-secondary-light radius-8">
                    <option>Today</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </div>
                <div className="row gy-4">
                  <div className="col-lg-6">
                    <div id="world-map" className="h-100 border radius-8" />
                  </div>
                  <div className="col-lg-6">
                    <div className="h-100 border p-16 pe-0 radius-8">
                      <div className="max-h-266-px overflow-y-auto scroll-sm pe-16">
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-12 pb-2">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag1.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">USA</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-primary-600 rounded-pill"
                                  style={{ width: "80%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              80%
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-12 pb-2">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag2.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">Japan</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-orange rounded-pill"
                                  style={{ width: "60%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              60%
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-12 pb-2">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag3.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">France</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-yellow rounded-pill"
                                  style={{ width: "49%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              49%
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-12 pb-2">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag4.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">Germany</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-success-main rounded-pill"
                                  style={{ width: "100%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              100%
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-12 pb-2">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag5.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">South Korea</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-info-main rounded-pill"
                                  style={{ width: "30%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              30%
                            </span>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between gap-3">
                          <div className="d-flex align-items-center w-100">
                            <img
                              src="images/flag1.png"
                              alt="Image"
                              className="w-40-px h-40-px rounded-circle flex-shrink-0 me-12"
                            />
                            <div className="flex-grow-1">
                              <h6 className="text-sm mb-0">USA</h6>
                              <span className="text-xs text-secondary-light fw-medium">
                                1,240 Users
                              </span>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 w-100">
                            <div className="w-100 max-w-66 ms-auto">
                              <div
                                className="progress progress-sm rounded-pill"
                                role="progressbar"
                                aria-label="Success example"
                                aria-valuenow={25}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="progress-bar bg-primary-600 rounded-pill"
                                  style={{ width: "80%" }}
                                />
                              </div>
                            </div>
                            <span className="text-secondary-light font-xs fw-semibold">
                              80%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xxl-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                  <h6 className="mb-2 fw-bold text-lg mb-0">Generated Content</h6>
                  <select className="form-select form-select-sm w-auto bg-base border text-secondary-light radius-8">
                    <option>Today</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </div>
                <ul className="d-flex flex-wrap align-items-center mt-3 gap-3">
                  <li className="d-flex align-items-center gap-2">
                    <span className="w-12-px h-12-px rounded-circle bg-primary-600" />
                    <span className="text-secondary-light text-sm fw-semibold">
                      Word:
                      <span className="text-primary-light fw-bold">500</span>
                    </span>
                  </li>
                  <li className="d-flex align-items-center gap-2">
                    <span className="w-12-px h-12-px rounded-circle bg-yellow" />
                    <span className="text-secondary-light text-sm fw-semibold">
                      Image:
                      <span className="text-primary-light fw-bold">300</span>
                    </span>
                  </li>
                </ul>
                <div className="mt-40">
                  <div id="paymentStatusChart" className="margin-16-minus" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Overview;