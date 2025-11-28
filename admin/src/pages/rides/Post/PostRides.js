import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import axios from "axios";
import { getPaymentStatusBadge, getRideStatusBadge, getTripTypeBadge, getVehicleTypeBadge } from "../../../utils/Badges";

const PostRides = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  
  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const initialLimit = parseInt(searchParams.get("limit")) || 10;
  const initialTripType = searchParams.get("tripType") || "";
  const initialVehicleType = searchParams.get("vehicleType") || "";
  const initialPaymentStatus = searchParams.get("paymentStatus") || "";
  const initialStartDate = searchParams.get("startDate") || "";
  const initialEndDate = searchParams.get("endDate") || "";

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [tripType, setTripType] = useState(initialTripType);
  const [vehicleType, setVehicleType] = useState(initialVehicleType);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  useEffect(() => {
    updateURL({ page, limit, tripType, vehicleType, paymentStatus, startDate, endDate });
  }, [page, limit, tripType, vehicleType, paymentStatus, startDate, endDate]);

  const updateURL = (updates) => {
    const newParams = new URLSearchParams();
    if (updates.page && updates.page !== 1) newParams.set("page", updates.page);
    if (updates.limit && updates.limit !== 10) newParams.set("limit", updates.limit);
    if (updates.tripType) newParams.set("tripType", updates.tripType);
    if (updates.vehicleType) newParams.set("vehicleType", updates.vehicleType);
    if (updates.paymentStatus) newParams.set("paymentStatus", updates.paymentStatus);
    if (updates.startDate) newParams.set("startDate", updates.startDate);
    if (updates.endDate) newParams.set("endDate", updates.endDate);
    setSearchParams(newParams, { replace: true });
  };

  const resetFilters = () => {
    setTripType("");
    setVehicleType("");
    setPaymentStatus("");
    setStartDate("");
    setEndDate("");
    setPage(1);
    setShowFilters(false);
  };

  const hasActiveFilters = tripType || vehicleType || paymentStatus || startDate || endDate;

  // Fetch rides
  useEffect(() => {
    const fetchRides = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = { page, limit };
        if (tripType) params.tripType = tripType;
        if (vehicleType) params.vehicleType = vehicleType;
        if (paymentStatus) params.paymentStatus = paymentStatus;
        if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        } else if (startDate) {
          params.pickupDate = startDate;
        }

        const res = await fetch(
          `http://localhost:3100/api/v1/post-rides?${new URLSearchParams(params)}`
        );
        const data = await res.json();

        if (data.success) {
          setRides(data.data || []);
          setTotal(data.pagination?.totalRides || 0);
          setPages(data.pagination?.totalPages || 1);
        }
      } catch (err) {
        setError("Failed to load post rides. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [page, limit, tripType, vehicleType, paymentStatus, startDate, endDate]);

  const handleDeleteRide = async (rideId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this ride post?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f06548",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`http://localhost:3100/api/v1/post-rides/${rideId}`);
      toast.success("Ride post deleted successfully");
      setRides((prev) => prev.filter((r) => r._id !== rideId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      toast.error("Failed to delete ride post");
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };


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
      {/* Header with Mobile Filter Button */}
      <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <h5 className="card-title mb-0">Posted Rides</h5>

        {/* Mobile-only Filter Toggle */}
        <button
          className="btn btn-primary d-block d-lg-none"
          onClick={() => setShowFilters(!showFilters)}
        >
          <iconify-icon icon="lucide:filter"></iconify-icon>
          Filters {hasActiveFilters && `(${Object.values({tripType,vehicleType,paymentStatus,startDate,endDate}).filter(Boolean).length})`}
        </button>
      </div>

      <div className="card-body">
        {/* Filters Card - Hidden on mobile unless toggled */}
        <div className={`card mb-20 ${showFilters ? 'd-block' : 'd-none d-lg-block'}`} style={{backgroundColor: '#f8f9fa'}}>
          <div className="card-body">
            <div className="row align-items-end g-3">
              <div className="col-12 col-md-6 col-lg-2 mb-3">
                <label className="form-label text-sm fw-medium">Trip Type</label>
                <select 
                  className="form-select"
                  value={tripType}
                  onChange={(e) => { setTripType(e.target.value); setPage(1); }}
                >
                  <option value="">All Types</option>
                  <option value="one-way">One Way</option>
                  <option value="round-trip">Round Trip</option>
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-2 mb-3">
                <label className="form-label text-sm fw-medium">Vehicle Type</label>
                <select 
                  className="form-select"
                  value={vehicleType}
                  onChange={(e) => { setVehicleType(e.target.value); setPage(1); }}
                >
                  <option value="">All Vehicles</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-2 mb-3">
                <label className="form-label text-sm fw-medium">Payment Status</label>
                <select 
                  className="form-select"
                  value={paymentStatus}
                  onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-2 mb-3">
                <label className="form-label text-sm fw-medium">Start Date</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
              </div>

              <div className="col-12 col-md-6 col-lg-2 mb-3">
                <label className="form-label text-sm fw-medium">End Date</label>
                <input 
                  type="date" 
                  className="form-control"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>

              <div className="col-12 col-lg-2 d-flex mb-3">
                <button 
                  className="btn d-flex align-items-center btn-outline-danger w-100 w-lg-auto"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                >
                  <iconify-icon icon="lucide:x" className="me-4"></iconify-icon>
                  Reset
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 pt-3" style={{borderTop: '1px solid #dee2e6'}}>
                <small className="text-muted me-2">Active Filters:</small>
                {tripType && <span className="badge bg-info me-2">Trip: {tripType}</span>}
                {vehicleType && <span className="badge bg-success me-2">Vehicle: {vehicleType}</span>}
                {paymentStatus && <span className="badge bg-warning me-2">Payment: {paymentStatus}</span>}
                {startDate && endDate && (
                  <span className="badge bg-primary me-2">
                    Date: {formatDate(startDate)} - {formatDate(endDate)}
                  </span>
                )}
                {startDate && !endDate && (
                  <span className="badge bg-primary me-2">From: {formatDate(startDate)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Wrapper - Scroll on Mobile */}
        <div className="table-responsive">
          <div id="dataTable_wrapper" className="dt-container dt-empty-footer">
            {/* Top Controls */}
            <div className="dt-layout-row d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
              <div className="dt-layout-cell dt-start">
                <div className="dt-length">
                  <select 
                    name="dataTable_length" 
                    className="dt-input" 
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <label> entries per page</label>
                </div>
              </div>
              <div className="dt-layout-cell dt-end text-muted">
                {total} Total Rides
              </div>
            </div>

            {/* Table */}
            <div className="dt-layout-row dt-layout-table">
              <div className="dt-layout-cell">
                <table className="table bordered-table mb-0 dataTable" id="dataTable">
                  <thead>
                    <tr>
                      <th><span className="dt-column-title">Posted By</span></th>
                      <th><span className="dt-column-title">Route</span></th>
                      <th><span className="dt-column-title">Pickup Details</span></th>
                      <th><span className="dt-column-title">Trip Type</span></th>
                      <th><span className="dt-column-title">Vehicle</span></th>
                      <th><span className="dt-column-title">Status</span></th>

                      <th><span className="dt-column-title">Amount</span></th>
                      <th><span className="dt-column-title">Payment</span></th>
                      <th><span className="dt-column-title">Posted On</span></th>
                      <th><span className="dt-column-title">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="9" style={{textAlign: 'center', padding: '60px'}}>
                          <div className="spinner-border text-primary" role="status"></div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr><td colSpan="9" className="text-danger text-center py-5">{error}</td></tr>
                    ) : rides.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{textAlign: 'center', padding: '60px'}}>
                          <iconify-icon icon="tabler:car-off" className="text-4xl mb-12 text-muted"></iconify-icon>
                          <p>No rides found.</p>
                        </td>
                      </tr>
                    ) : (
                      rides.map((ride, index) => (
                        <tr key={ride._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0 me-12">
                                <div className="w-40-px h-40-px rounded-circle bg-primary-focus d-flex align-items-center justify-content-center">
                                  <iconify-icon icon="lucide:user" className="text-primary-main"></iconify-icon>
                                </div>
                              </div>
                              <div>
                                <h6 className="text-sm mb-0 fw-medium">{ride.driverPostId?.driver_name || 'N/A'}</h6>
                                <small className="text-muted">{ride.driverPostId?.driver_contact_number || 'N/A'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">
                              <div className="fw-medium text-truncate" style={{maxWidth: '150px'}}>
                                <iconify-icon icon="material-symbols:location-on" className="text-success-main"></iconify-icon>
                                {ride.pickupAddress.split(',')[0]}
                              </div>
                              <div className="text-muted text-truncate" style={{maxWidth: '150px'}}>
                                <iconify-icon icon="material-symbols:flag" className="text-danger-main"></iconify-icon>
                                {ride.dropAddress.split(',')[0]}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">
                              <div className="fw-medium">{formatDate(ride.pickupDate)}</div>
                              <small className="text-muted">{formatTime(ride.pickupTime)}</small>
                            </div>
                          </td>
                          <td className="text-center">{getTripTypeBadge(ride.tripType)}</td>
                          <td className="text-center">{getVehicleTypeBadge(ride.vehicleType)}</td>
                          <td className="text-center">{getRideStatusBadge(ride.rideStatus || "")}</td>

                          <td>
                            <div className="text-sm">
                              <div className="fw-bold text-success-main">₹{ride.totalAmount.toLocaleString()}</div>
                              <small className="text-muted">Driver: ₹{ride.driverEarning.toLocaleString()}</small>
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">
                              {getPaymentStatusBadge(ride.paymentStatus)}
                              <div className="text-muted mt-1">{ride.paymentMethod.toUpperCase()}</div>
                            </div>
                          </td>
                          <td className="text-muted">{formatDate(ride.createdAt)}</td>
                          <td>
                            <a href={`/post-rides/view/${ride._id}`} className="w-32-px h-32-px bg-primary-light text-primary-600 rounded-circle d-inline-flex align-items-center justify-content-center me-2">
                              <iconify-icon icon="iconamoon:eye-light"></iconify-icon>
                            </a>
                            <a href={`/post-rides/edit/${ride._id}`} className="w-32-px h-32-px bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center me-2">
                              <iconify-icon icon="lucide:edit"></iconify-icon>
                            </a>
                            <button
                              onClick={() => handleDeleteRide(ride._id)}
                              className="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                              style={{border: 'none'}}
                            >
                              <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {!loading && rides.length > 0 && (
              <div className="dt-layout-row mt-3">
                <div className="dt-layout-cell dt-start">
                  <div className="dt-info">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
                  </div>
                </div>
                <div className="dt-layout-cell dt-end">
                  <div className="dt-paging paging_full_numbers">
                    <button className={`dt-paging-button first ${page === 1 ? 'disabled' : ''}`} onClick={() => setPage(1)} disabled={page === 1}>«</button>
                    <button className={`dt-paging-button previous ${page === 1 ? 'disabled' : ''}`} onClick={() => setPage(page - 1)} disabled={page === 1}>‹</button>
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
                    <button className={`dt-paging-button next ${page === pages ? 'disabled' : ''}`} onClick={() => setPage(page + 1)} disabled={page === pages}>›</button>
                    <button className={`dt-paging-button last ${page === pages ? 'disabled' : ''}`} onClick={() => setPage(pages)} disabled={page === pages}>»</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostRides;