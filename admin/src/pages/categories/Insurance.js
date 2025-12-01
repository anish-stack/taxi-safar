import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Insurance = () => {
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [selectedNewStatus, setSelectedNewStatus] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const API_BASE = "http://localhost:3100/api/v1";

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
      };
      if (searchTerm.trim()) params.driver = searchTerm.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get(`${API_BASE}/insurance-admin`, { params });
      if (res.data.success) {
        setInsurances(res.data.data);
        setTotalPages(res.data.pagination.pages);
        setTotalItems(res.data.pagination.total);
      }
    } catch (err) {
      toast.error("Failed to load insurance requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsurances();
  }, [page, searchTerm, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Reset to page 1 on search/filter
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  const openStatusModal = (insurance, newStatus) => {
    setSelectedInsurance(insurance);
    setSelectedNewStatus(newStatus);
    setShowStatusModal(true);
  };

  const closeModal = () => {
    setShowStatusModal(false);
    setSelectedInsurance(null);
    setSelectedNewStatus("");
  };

  const confirmStatusUpdate = async () => {
    if (!selectedInsurance || updatingId) return;

    setUpdatingId(selectedInsurance._id);

    try {
      const res = await axios.put(
        `${API_BASE}/insurance/status/${selectedInsurance._id}`,
        {
          status: selectedNewStatus,
        }
      );

      if (res.data.success) {
        toast.success(`Status changed to ${selectedNewStatus}`);
        setInsurances((prev) =>
          prev.map((item) =>
            item._id === selectedInsurance._id
              ? { ...item, status: selectedNewStatus }
              : item
          )
        );
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
      closeModal();
    }
  };

  const deleteInsurance = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request?"))
      return;
    setDeletingId(id);

    try {
      await axios.delete(`${API_BASE}/insurance/${id}`);
      toast.success("Request deleted successfully");
      setInsurances((prev) => prev.filter((item) => item._id !== id));
      if (insurances.length === 1 && page > 1) setPage((prev) => prev - 1);
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-warning-focus text-warning-main",
      processing: "bg-info-focus text-info-main",
      completed: "bg-success-focus text-success-main",
      rejected: "bg-danger-focus text-danger-main",
    };
    return `px-24 py-4 rounded-pill fw-medium text-sm ${
      styles[status] || "bg-secondary-focus"
    }`;
  };

  const getStatusColor = (status) => {
    return status === "completed"
      ? "text-success"
      : status === "rejected"
      ? "text-danger"
      : status === "processing"
      ? "text-info"
      : "text-warning";
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border text-primary"
          style={{ width: "3rem", height: "3rem" }}
        ></div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid py-4 px-4 px-lg-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 mb-0 fw-bold text-primary-light">
            Insurance Requests
          </h2>
          <div className="text-neutral-600">
            Total: <strong>{totalItems}</strong> requests
          </div>
        </div>

        {/* Filters */}
        <div className="card radius-12 border-0 shadow-sm mb-4">
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control radius-8"
                  placeholder="Search by name, phone, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-select radius-8"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="col-md-2">
                <button
                  onClick={fetchInsurances}
                  className="btn btn-primary w-100 radius-8"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

<div className="card basic-data-table">
          <div className="card-header">
            <h5 className="card-title mb-0">All Insurance Requests</h5>
          </div>
          <div className="card-body">
            {insurances.length === 0 ? (
              <div className="text-center py-5">
                <iconify-icon icon="solar:inbox-archive-bold-duotone" width="80" className="text-neutral-400"></iconify-icon>
                <p className="mt-3 text-neutral-600">No insurance requests found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>Request ID</th>
                      <th>Driver</th>
                      <th>Vehicle</th>
                      <th>Budget</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Requested On</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insurances.map((ins, index) => {
                      const driver = ins.driverDetails || {};
                      const isUpdating = updatingId === ins._id;

                      return (
                        <tr key={ins._id}>
                          <td>{index + 1}</td>
                          <td>
                            <a  className="text-primary-600">
                              #{ins._id.slice(-8).toUpperCase()}
                            </a>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="w-40-px h-40-px rounded-circle bg-neutral-200 d-flex align-items-center justify-content-center flex-shrink-0">
                                <iconify-icon icon="solar:user-bold" className="text-xl text-neutral-600"></iconify-icon>
                              </div>
                              <div>
                                <h6 className="text-md mb-0 fw-medium">{driver.full_name || ins.full_name}</h6>
                                <small className="text-neutral-600">{driver.contact_number || ins.contact_number}</small>
                              </div>
                            </div>
                          </td>
                          <td>{driver.vehicle_number || ins.vehicle_number}</td>
                          <td>₹{ins.budget.toLocaleString()}</td>
                          <td className="text-capitalize">{ins.insurance_type.replace('_', ' ')}</td>
                          <td>
                            <span className={getStatusBadge(ins.status)}>
                              {ins.status.charAt(0).toUpperCase() + ins.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            {new Date(ins.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td>
                            {isUpdating ? (
                              <div className="d-flex align-items-center gap-2">
                                <span className="spinner-border spinner-border-sm text-primary"></span>
                                <span className="text-sm text-primary">Updating...</span>
                              </div>
                            ) : (
                              <div className="d-flex gap-2 flex-wrap">
                                {/* Status Action Buttons */}
                                {ins.status !== 'processing' && (
                                  <button
                                    onClick={() => openStatusModal(ins, 'processing')}
                                    className="btn btn-sm btn-outline-info"
                                    title="Mark as Processing"
                                  >
                                    <iconify-icon icon="solar:refresh-circle-bold"></iconify-icon>
                                  </button>
                                )}
                                {ins.status !== 'completed' && (
                                  <button
                                    onClick={() => openStatusModal(ins, 'completed')}
                                    className="btn btn-sm btn-outline-success"
                                    title="Mark as Completed"
                                  >
                                    <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                                  </button>
                                )}
                                {ins.status !== 'rejected' && (
                                  <button
                                    onClick={() => openStatusModal(ins, 'rejected')}
                                    className="btn btn-sm btn-outline-danger"
                                    title="Mark as Rejected"
                                  >
                                    <iconify-icon icon="solar:close-circle-bold"></iconify-icon>
                                  </button>
                                )}

                                {/* Delete Button */}
                                <button
                                  onClick={() => deleteInsurance(ins._id)}
                                  disabled={deletingId === ins._id}
                                  className="w-32-px h-32-px bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center"
                                  title="Delete"
                                >
                                  {deletingId === ins._id ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                  ) : (
                                    <iconify-icon icon="mingcute:delete-2-line"></iconify-icon>
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Status Change Confirmation Modal */}
      {showStatusModal && selectedInsurance && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-9999"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* Modal Card - Matches your card design system */}
          <div
            className="card radius-16 border-0 shadow-lg animate__animated animate__zoomIn animate__faster"
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "linear-gradient(145deg, #ffffff, #f8fafc)",
              overflow: "hidden",
            }}
          >
            {/* Header with Icon */}
            <div className="card-header bg-transparent border-0 text-center pt-5 pb-4 px-4">
              <h4 className="h4 fw-bold text-dark mb-2">
                Confirm Status Change
              </h4>
              <p className="text-neutral-600 fs-15 mb-0">
                You are about to update the status of this insurance request
              </p>
            </div>

            {/* Body */}
            <div className="card-body pt-3 pb-5 px-5 text-center">
              <div className="bg-neutral-100 radius-12 py-4 px-3 mb-4">
                <p className="mb-2 text-neutral-600 small">New Status</p>
                <span
                  className={`fw-bold fs-4 text-capitalize ${getStatusColor(
                    selectedNewStatus
                  )}`}
                >
                  {selectedNewStatus === "pending"
                    ? "Pending"
                    : selectedNewStatus === "processing"
                    ? "Processing"
                    : selectedNewStatus === "completed"
                    ? "Completed"
                    : "Rejected"}
                </span>
              </div>

              <div className="d-flex gap-3 mt-4">
                <button
                  onClick={closeModal}
                  disabled={updatingId}
                  className="btn btn-outline-secondary flex-fill py-12 radius-12 fw-semibold text-md"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmStatusUpdate}
                  disabled={updatingId}
                  className={`btn flex-fill py-12 radius-12 fw-semibold text-white d-flex align-items-center justify-content-center gap-2
              ${
                selectedNewStatus === "completed"
                  ? "btn-success hover-bg-success"
                  : selectedNewStatus === "rejected"
                  ? "btn-danger hover-bg-danger"
                  : selectedNewStatus === "processing"
                  ? "btn-info hover-bg-info"
                  : "btn-warning hover-bg-warning"
              }
            `}
                >
                  {updatingId ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                      Confirm Change
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Insurance;
