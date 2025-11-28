import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import axios from "axios";
const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize from URL
  const initialPage = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const initialLimit = parseInt(searchParams.get("limit")) || 10;
  const initialSearch = searchParams.get("search") || "";

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // ------------------------------
  // 🔍 Debounce Search (Only if len >= 3)
  // ------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length === 0 || search.length >= 3) {
        setDebouncedSearch(search);
        setPage(1);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [search]);

  // Sync page & limit to URL
  useEffect(() => {
    updateURL({ 
      page, 
      limit, 
      search: debouncedSearch 
    });
  }, [page, limit, debouncedSearch]);

  const updateURL = (updates) => {
    const newParams = new URLSearchParams();

    if (updates.page && updates.page !== 1) {
      newParams.set("page", updates.page);
    }
    if (updates.limit && updates.limit !== 10) {
      newParams.set("limit", updates.limit);
    }
    if (updates.search && updates.search.trim()) {
      newParams.set("search", updates.search.trim());
    }

    setSearchParams(newParams, { replace: true });
  };

  // ------------------------------
  // 📡 Fetch Drivers
  // ------------------------------
  useEffect(() => {
    const fetchDrivers = async () => {
      // Only show loading if we have a valid search (empty or 3+ chars)
      if (debouncedSearch.length > 0 && debouncedSearch.length < 3) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = { page, limit };

        if (debouncedSearch.trim().length >= 3) {
          params.search = debouncedSearch.trim();
        }

        const res = await fetch(
          `http://localhost:3100/api/v1/get-drivers?${new URLSearchParams(params)}`
        );
        
        const data = await res.json();

        if (data.success) {
          setDrivers(data.data || []);
          setTotal(data.pagination?.total || 0);
          setPages(data.pagination?.pages || 1);
        }
      } catch (err) {
        setError("Failed to load drivers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, [page, limit, debouncedSearch]);

 const handleBlockDriver = async (driverId, currentStatus) => {
    const isActive = currentStatus === "active";
    const action = isActive ? "block" : "unblock";
    const newStatus = isActive ? "blocked" : "active";

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to ${action} this driver?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isActive ? "#f06548" : "#28a745",
      confirmButtonText: isActive ? "Yes, Block" : "Yes, Unblock",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.patch(`http://localhost:3100/api/v1/driver/${driverId}/status`, {
        account_status: newStatus,
      });

      toast.success(`Driver ${action}ed successfully`);
      setDrivers((prev) =>
        prev.map((d) => (d._id === driverId ? { ...d, account_status: newStatus } : d))
      );
    } catch (err) {
      toast.error("Failed to update driver status");
    }
  };
  // Helpers
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getStatusBadge = (status) => {
    const map = {
      active: { bg: 'bg-success-focus', text: 'text-success-main' },
      blocked: { bg: 'bg-danger-focus', text: 'text-danger-main' },
      pending: { bg: 'bg-warning-focus', text: 'text-warning-main' },
    };
    const style = map[status] || { bg: 'bg-secondary-focus', text: 'text-secondary-main' };
    return (
      <span className={`px-24 py-4 rounded-pill text-sm fw-medium ${style.bg} ${style.text}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const Check = () => <iconify-icon icon="akar-icons:check" className="text-success-main text-xl"></iconify-icon>;
  const Cross = () => <iconify-icon icon="akar-icons:cross" className="text-danger-main text-xl"></iconify-icon>;

  // Check if search is too short (1-2 chars)
  const isSearchTooShort = search.length > 0 && search.length < 3;

  // Pagination range
  const getPaginationRange = () => {
    const delta = 1;
    const range = [];
    for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
      range.push(i);
    }
    if (page - delta > 2) range.unshift('...');
    if (page + delta < pages - 1) range.push('...');
    range.unshift(1);
    if (pages > 1) range.push(pages);
    return range;
  };

  return (
    <div className="card basic-data-table">
      {/* Header */}
      <div className="card-header">
        <h5 className="card-title mb-0">Onboard Drivers</h5>
      </div>

      <div className="card-body">
        <div id="dataTable_wrapper" className="dt-container dt-empty-footer">
          {/* Top controls */}
          <div className="dt-layout-row">
            <div className="dt-layout-cell dt-start">
              <div className="dt-length">
                <select 
                  name="dataTable_length" 
                  aria-controls="dataTable" 
                  className="dt-input" 
                  id="dt-length-0"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <label htmlFor="dt-length-0"> entries per page</label>
              </div>
            </div>
            <div className="dt-layout-cell dt-end">
              <div className="dt-search">
                <label htmlFor="dt-search-0">Search:</label>
                <input 
                  type="search" 
                  className="dt-input" 
                  id="dt-search-0" 
                  placeholder="Min 3 characters..." 
                  aria-controls="dataTable"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Warning for short search */}
          {isSearchTooShort && (
            <div className="dt-layout-row">
              <div className="dt-layout-cell" style={{padding: '10px 0'}}>
                <div className="bg-warning-focus text-warning-main px-24 py-8 rounded text-sm fw-medium">
                  Please enter at least 3 characters to search
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="dt-layout-row dt-layout-table">
            <div className="dt-layout-cell">
              <table className="table bordered-table mb-0 dataTable" id="dataTable" data-page-length="10">
                <thead>
                  <tr>
                    <th scope="col" className="dt-orderable-asc dt-orderable-desc">
                      <span className="dt-column-title">
                        <div className="form-check style-check d-flex align-items-center">
                          <input className="form-check-input" type="checkbox" />
                          <label className="form-check-label">S.L</label>
                        </div>
                      </span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">ID</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Driver</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Contact</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Gender</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Aadhaar</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Vehicle</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Bank</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Status</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Joined</span>
                    </th>
                    <th scope="col">
                      <span className="dt-column-title">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isSearchTooShort ? (
                    <tr>
                      <td colSpan="11" style={{textAlign: 'center', padding: '40px'}}>
                        <div className="text-muted">
                          <p className="mb-0">Type at least 3 characters to search drivers</p>
                        </div>
                      </td>
                    </tr>
                  ) : loading ? (
                    <tr>
                      <td colSpan="11" style={{textAlign: 'center', padding: '40px'}}>
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="11" style={{textAlign: 'center', padding: '40px'}} className="text-danger fw-medium">
                        {error}
                      </td>
                    </tr>
                  ) : drivers.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{textAlign: 'center', padding: '40px'}}>
                        <div className="text-muted">
                          <iconify-icon icon="tabler:user-off" className="text-4xl mb-12 text-muted"></iconify-icon>
                          <p className="mb-0">No drivers found matching your search.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    drivers.map((driver, index) => {
                      const isActive = driver.account_status === 'active';
                      const serialNumber = (page - 1) * limit + index + 1;

                      return (
                        <tr key={driver._id}>
                          <td>
                            <div className="form-check style-check d-flex align-items-center">
                              <input className="form-check-input" type="checkbox" />
                              <label className="form-check-label">{String(serialNumber).padStart(2, '0')}</label>
                            </div>
                          </td>
                          <td>
                            <a href={`/driver/${driver._id}`} className="text-primary-600">
                              #{driver._id.slice(-6).toUpperCase()}
                            </a>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={driver.profile_image || "assets/images/user-list/user-list1.png"}
                                alt={driver.driver_name}
                                className="flex-shrink-0 me-12 radius-8"
                                style={{width: '40px', height: '40px', objectFit: 'cover'}}
                              />
                              <h6 className="text-md mb-0 fw-medium flex-grow-1">{driver.driver_name}</h6>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div className="fw-medium">{driver.driver_contact_number}</div>
                              <small className="text-muted">{driver.driver_email}</small>
                            </div>
                          </td>
                          <td style={{textAlign: 'center'}}>
                            <span className={`px-12 py-4 rounded-pill text-xs fw-medium ${driver.driver_gender === 'M' ? 'bg-info-focus text-info-main' : 'bg-pink-focus text-pink-main'}`}>
                              {driver.driver_gender === 'M' ? 'Male' : 'Female'}
                            </span>
                          </td>
                          <td style={{textAlign: 'center'}}>{driver.aadhar_verified ? <Check /> : <Cross />}</td>
                          <td style={{textAlign: 'center'}}>{driver.current_vehicle_id ? <Check /> : <Cross />}</td>
                          <td style={{textAlign: 'center'}}>{driver.BankDetails ? <Check /> : <Cross />}</td>
                          <td>{getStatusBadge(driver.account_status)}</td>
                          <td className="text-muted">{formatDate(driver.createdAt)}</td>
                          <td>
                            <a href={`/driver/view/${driver._id}`} className="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center">
                              <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                            </a>
                            <a href={`/driver/edit/${driver._id}`} className="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center">
                              <iconify-icon icon="lucide:edit"></iconify-icon>
                            </a>
                            <button
                              onClick={() => handleBlockDriver(driver._id, driver.account_status)}
                              className={`w-32-px h-32-px rounded-circle d-inline-flex align-items-center justify-content-center ${isActive ? 'bg-warning-focus text-warning-main' : 'bg-success-focus text-success-main'}`}
                              style={{border: 'none', cursor: 'pointer'}}
                            >
                              <iconify-icon icon={isActive ? "material-symbols:block" : "material-symbols:check-circle-outline"}></iconify-icon>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!loading && !isSearchTooShort && drivers.length > 0 && (
            <div className="dt-layout-row">
              <div className="dt-layout-cell dt-start">
                <div className="dt-info" aria-live="polite" id="dataTable_info" role="status">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                </div>
              </div>
              <div className="dt-layout-cell dt-end">
                <div className="dt-paging paging_full_numbers">
                  <button 
                    className={`dt-paging-button first ${page === 1 ? 'disabled' : ''}`}
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    «
                  </button>
                  <button 
                    className={`dt-paging-button previous ${page === 1 ? 'disabled' : ''}`}
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    ‹
                  </button>
                  
                  {getPaginationRange().map((p, i) => (
                    <button
                      key={i}
                      className={`dt-paging-button ${p === '...' ? 'disabled' : ''} ${p === page ? 'current' : ''}`}
                      onClick={() => p !== '...' && setPage(p)}
                      disabled={p === '...'}
                    >
                      {p}
                    </button>
                  ))}
                  
                  <button 
                    className={`dt-paging-button next ${page === pages ? 'disabled' : ''}`}
                    onClick={() => setPage(page + 1)}
                    disabled={page === pages}
                  >
                    ›
                  </button>
                  <button 
                    className={`dt-paging-button last ${page === pages ? 'disabled' : ''}`}
                    onClick={() => setPage(pages)}
                    disabled={page === pages}
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drivers;