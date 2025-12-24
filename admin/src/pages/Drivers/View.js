
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const DriverView = () => {
    const { id } = useParams();
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Toggle states for collapsible sections
    const [toggles, setToggles] = useState({
        personal: true,
        documents: false,
        vehicle: false,
        rcDetails: false,
        insurance: false,
        permit: false,
        vehiclePhotos: false,
        bank: false,
        location: false
    });

    useEffect(() => {
        const fetchDriver = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`https://test.taxi.olyox.in/api/v1/driver-details/${id}`);
                const data = await res.json();

                if (data.success) {
                    setDriver(data.data);
                } else {
                    setError('Driver not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load driver details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDriver();
    }, [id]);

    const toggle = (section) => {
        setToggles(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const InfoRow = ({ label, value, className = '' }) => (
        <div className={`col-md-6 ${className}`}>
            <div className="mb-3">
                <label className="text-neutral-600 text-sm mb-1 d-block fw-medium">{label}</label>
                <p className="mb-0 text-secondary-light">{value || '—'}</p>
            </div>
        </div>
    );

    const Badge = ({ status, type = 'status' }) => {
        const statusMap = {
            active: { bg: 'bg-success-focus', text: 'text-success-main', label: 'Active' },
            blocked: { bg: 'bg-danger-focus', text: 'text-danger-main', label: 'Blocked' },
            pending: { bg: 'bg-warning-focus', text: 'text-warning-main', label: 'Pending' },
            approved: { bg: 'bg-success-focus', text: 'text-success-main', label: 'Approved' },
            ACTIVE: { bg: 'bg-success-focus', text: 'text-success-main', label: 'Active' }
        };

        const style = statusMap[status] || { bg: 'bg-secondary-focus', text: 'text-secondary-light', label: status };

        return (
            <span className={`px-24 py-4 rounded-pill text-sm fw-medium ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
                <div className="spinner-border text-primary-600" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="card h-100 radius-12">
                <div className="card-body text-center py-5">
                    <iconify-icon icon="tabler:user-off" style={{ fontSize: '48px' }} className="text-danger-600 mb-3 d-block"></iconify-icon>
                    <h5 className="text-danger-600 mb-3">{error || 'Driver not found'}</h5>
                    <Link to="/drivers/all" className="btn rounded-pill btn-primary-600 radius-8 px-20 py-11">
                        <iconify-icon icon="ic:round-arrow-back" className="me-2"></iconify-icon>
                        Back to Drivers
                    </Link>
                </div>
            </div>
        );
    }

    const d = driver;
    const doc = d.document_id || {};
    const vehicle = d.current_vehicle_id || {};
    const bank = d.BankDetails || {};
    const location = d.current_location || {};

    return (
        <div className="row g-4 px-12 py-4">
            {/* Header with Breadcrumb */}
            <div className="col-12 py-6">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                    <div>
                        <nav aria-label="breadcrumb">
                            <ol className="breadcrumb mb-0 text-sm">
                                <li className="breadcrumb-item"><Link to="/drivers/all" className="text-primary-600">Drivers</Link></li>
                                <li className="breadcrumb-item active text-neutral-600">#{d._id?.slice(-8).toUpperCase()}</li>
                            </ol>
                        </nav>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-3">
                        <Link to="/drivers/all" className="btn rounded-pill d-flex align-items-center btn-neutral-900 text-base radius-8">
                            <iconify-icon icon="ic:round-arrow-back" className="me-2"></iconify-icon>
                            Back
                        </Link>
                        <Link to={`/driver/edit/${d._id}`} className="btn   d-flex align-items-center rounded-pill btn-primary-600 radius-8">
                            <iconify-icon icon="lucide:edit" className="me-2"></iconify-icon>
                            Edit Driver
                        </Link>
                    </div>
                </div>
            </div>

            {/* Profile Summary Card */}
            <div className="col-xxl-4 col-lg-5">
                <div className="card h-100 radius-12">
                    <div className="card-body p-24 text-center">
                        <img
                            src={d.profile_photo?.url || 'https://via.placeholder.com/120'}
                            alt={d.driver_name}
                            className="rounded-circle mb-3 border border-3 border-neutral-200"
                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                        />
                        <h5 className="mb-1 fw-bold text-primary-light">{d.driver_name}</h5>
                        <p className="text-neutral-600 text-sm mb-3">ID: #{d._id?.slice(-8).toUpperCase()}</p>

                        <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
                            {d.is_online ? (
                                <span className="badge bg-success-focus text-success-main px-12 py-6">Online</span>
                            ) : (
                                <span className="badge bg-secondary-focus text-secondary-light px-12 py-6">Offline</span>
                            )}
                            {d.is_on_ride && <span className="badge bg-info-focus text-info-main px-12 py-6">On Ride</span>}
                            <Badge status={d.account_status} />
                        </div>

                        <div className="row g-3 text-center mb-4">
                            <div className="col-4">
                                <div className="p-3 bg-primary-100 radius-8">
                                    <h6 className="mb-0 fw-bold text-primary-light">{d.average_rating || 0}</h6>
                                    <small className="text-neutral-600">Rating</small>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="p-3 bg-success-100 radius-8">
                                    <h6 className="mb-0 fw-bold text-primary-light">{d.total_rides || 0}</h6>
                                    <small className="text-neutral-600">Total</small>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="p-3 bg-info-100 radius-8">
                                    <h6 className="mb-0 fw-bold text-primary-light">{d.completed_rides || 0}</h6>
                                    <small className="text-neutral-600">Completed</small>
                                </div>
                            </div>
                        </div>

                        <div className="text-start border-top pt-3">
                            <p className="mb-2 text-sm d-flex align-items-center gap-2">
                                <iconify-icon icon="ic:round-phone" className="text-primary-600 text-xl"></iconify-icon>
                                <span className="text-secondary-light">{d.driver_contact_number}</span>
                            </p>
                            <p className="mb-2 text-sm d-flex align-items-center gap-2">
                                <iconify-icon icon="ic:round-email" className="text-primary-600 text-xl"></iconify-icon>
                                <span className="text-secondary-light">{d.driver_email || 'N/A'}</span>
                            </p>
                            <p className="mb-0 text-sm d-flex align-items-center gap-2">
                                <iconify-icon icon="ic:round-calendar-today" className="text-primary-600 text-xl"></iconify-icon>
                                <span className="text-secondary-light">Joined: {formatDate(d.createdAt)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Details Column */}
            <div className="col-xxl-8 col-lg-7">
                {/* Personal Information */}
                <div className="card radius-12 mb-4">
                    <div
                        className="card-header d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggle('personal')}
                    >
                        <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                            <iconify-icon icon="ic:round-person" className="text-xl"></iconify-icon>
                            Personal Information
                        </h6>
                        <iconify-icon
                            icon={toggles.personal ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                            className="text-xl text-primary-600"
                        ></iconify-icon>
                    </div>
                    {toggles.personal && (
                        <div className="card-body p-24">
                            <div className="row">
                                <InfoRow label="Full Name" value={d.driver_name} />
                                <InfoRow label="Contact Number" value={d.driver_contact_number} />
                                <InfoRow label="Email" value={d.driver_email} />
                                <InfoRow label="Date of Birth" value={formatDate(d.driver_dob)} />
                                <InfoRow label="Gender" value={
                                    <span className={`px-12 py-4 rounded-pill text-xs fw-medium ${d.driver_gender === 'M' ? 'bg-info-focus text-info-main' : 'bg-pink-focus text-pink-main'}`}>
                                        {d.driver_gender === 'M' ? 'Male' : 'Female'}
                                    </span>
                                } />
                                <InfoRow label="Referral Code" value={d.referral_id} />
                                <InfoRow label="Aadhaar Verified" value={
                                    d.aadhar_verified ?
                                        <span className="text-success-600 fw-bold">✓ Verified</span> :
                                        <span className="text-danger-600 fw-bold">✗ Not Verified</span>
                                } />
                                <InfoRow label="Account Status" value={<Badge status={d.account_status} />} />
                                <InfoRow label="Steps Completed" value={`${d.steps_complete || 0} / 5`} />
                                <InfoRow label="Current Radius (km)" value={d.currentRadius} />
                                <InfoRow label="Device ID" value={d.device_id} />
                                <InfoRow label="Created At" value={formatDateTime(d.createdAt)} />
                                <InfoRow label="Last Updated" value={formatDateTime(d.updatedAt)} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents */}
                {doc._id && (
                    <div className="card radius-12 mb-4">
                        <div
                            className="card-header d-flex justify-content-between align-items-center"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggle('documents')}
                        >
                            <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                <iconify-icon icon="ic:round-description" className="text-xl"></iconify-icon>
                                Documents
                            </h6>
                            <iconify-icon
                                icon={toggles.documents ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                className="text-xl text-primary-600"
                            ></iconify-icon>
                        </div>
                        {toggles.documents && (
                            <div className="card-body p-24">
                                <div className="row">
                                    {/* Aadhaar Card */}
                                    <div className="col-12 mb-4 pb-3 border-bottom">
                                        <h6 className="fw-bold mb-3 text-primary-600">Aadhaar Card</h6>
                                        <div className="row">
                                            <InfoRow label="Aadhaar Number" value={doc.aadhar_card?.document_number} />
                                            <InfoRow label="Verified" value={
                                                doc.aadhar_card?.verified ?
                                                    <span className="text-success-600">✓ Yes</span> :
                                                    <span className="text-warning-600">⏱ Pending</span>
                                            } />
                                            <InfoRow label="Uploaded At" value={formatDateTime(doc.aadhar_card?.uploaded_at)} />
                                            <div className="col-12">
                                                <div className="d-flex flex-wrap align-items-center gap-3">
                                                    {doc.aadhar_card?.front?.url && (
                                                        <a href={doc.aadhar_card.front.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-primary-600 radius-8 px-20 py-11">
                                                            <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                            View Front
                                                        </a>
                                                    )}
                                                    {doc.aadhar_card?.back?.url && (
                                                        <a href={doc.aadhar_card.back.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-info-600 radius-8 px-20 py-11">
                                                            <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                            View Back
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PAN Card */}
                                    <div className="col-12 mb-4 pb-3 border-bottom">
                                        <h6 className="fw-bold mb-3 text-primary-600">PAN Card</h6>
                                        <div className="row">
                                            <InfoRow label="Verified" value={
                                                doc.pan_card?.verified ?
                                                    <span className="text-success-600">✓ Yes</span> :
                                                    <span className="text-warning-600">⏱ Pending</span>
                                            } />
                                            <InfoRow label="Uploaded At" value={formatDateTime(doc.pan_card?.uploaded_at)} />
                                            <div className="col-12">
                                                {doc.pan_card?.document?.url && (
                                                    <a href={doc.pan_card.document.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-primary-600 radius-8 px-20 py-11">
                                                        <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                        View PAN Card
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Driving License */}
                                    <div className="col-12">
                                        <h6 className="fw-bold mb-3 text-primary-600">Driving License</h6>
                                        <div className="row">
                                            <InfoRow label="License Number" value={doc.driving_license?.license_number} />
                                            <InfoRow label="Verified" value={
                                                doc.driving_license?.verified ?
                                                    <span className="text-success-600">✓ Yes</span> :
                                                    <span className="text-warning-600">⏱ Pending</span>
                                            } />
                                            <InfoRow label="Uploaded At" value={formatDateTime(doc.driving_license?.uploaded_at)} />
                                            <div className="col-12">
                                                <div className="d-flex flex-wrap align-items-center gap-3">
                                                    {doc.driving_license?.front?.url && (
                                                        <a href={doc.driving_license.front.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-primary-600 radius-8 px-20 py-11">
                                                            <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                            View Front
                                                        </a>
                                                    )}
                                                    {doc.driving_license?.back?.url && (
                                                        <a href={doc.driving_license.back.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-info-600 radius-8 px-20 py-11">
                                                            <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                            View Back
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Vehicle Details */}
                {vehicle._id && (
                    <>
                        <div className="card radius-12 mb-4">
                            <div
                                className="card-header d-flex justify-content-between align-items-center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggle('vehicle')}
                            >
                                <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                    <iconify-icon icon="ic:round-directions-car" className="text-xl"></iconify-icon>
                                    Vehicle Information
                                </h6>
                                <div className="d-flex align-items-center gap-3">
                                    <Badge status={vehicle.approval_status} />
                                    <iconify-icon
                                        icon={toggles.vehicle ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                        className="text-xl text-primary-600"
                                    ></iconify-icon>
                                </div>
                            </div>
                            {toggles.vehicle && (
                                <div className="card-body p-24">
                                    <div className="row">
                                        <InfoRow label="Vehicle Number" value={<span className="fw-bold text-lg">{vehicle.vehicle_number}</span>} />
                                        <InfoRow label="Vehicle Type" value={vehicle.vehicle_type?.toUpperCase()} />
                                        <InfoRow label="Brand" value={vehicle.vehicle_brand} />
                                        <InfoRow label="Model" value={vehicle.vehicle_name} />
                                        <InfoRow label="Ownership" value={vehicle.vehicle_ownership?.toUpperCase()} />
                                        <InfoRow label="Fuel Type" value={vehicle.fuel_type} />
                                        <InfoRow label="Color" value={vehicle.color} />
                                        <InfoRow label="Chassis Number" value={vehicle.chassis_number} />
                                        <InfoRow label="Engine Number" value={vehicle.engine_number} />
                                        <InfoRow label="Manufacturing Date" value={vehicle.manufacturing_date} />
                                        <InfoRow label="Seating Capacity" value={vehicle.seating_capacity} />
                                        <InfoRow label="Norms Type" value={vehicle.norms_type} />
                                        <InfoRow label="Vehicle Category" value={vehicle.vehicle_category} />
                                        <InfoRow label="RTO Code" value={vehicle.rto_code} />
                                        <InfoRow label="Registered At" value={vehicle.registered_at} />
                                        <InfoRow label="Status" value={vehicle.is_active ? <span className="text-success-600">Active</span> : <span className="text-danger-600">Inactive</span>} />
                                    </div>

                                    {/* Owner Details */}
                                    {vehicle.owner_details && (
                                        <div className="mt-4 pt-4 border-top">
                                            <h6 className="fw-bold mb-3 text-primary-600">Owner Details</h6>
                                            <div className="row">
                                                <InfoRow label="Owner Name" value={vehicle.owner_details.owner_name} />
                                                <InfoRow label="Father's Name" value={vehicle.owner_details.father_name} />
                                                <InfoRow label="Owner Number" value={vehicle.owner_details.owner_number} />
                                                <InfoRow label="Present Address" value={vehicle.owner_details.present_address} className="col-12" />
                                                <InfoRow label="Permanent Address" value={vehicle.owner_details.permanent_address} className="col-12" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Financer Details */}
                                    {vehicle.financer_details && (
                                        <div className="mt-4 pt-4 border-top">
                                            <h6 className="fw-bold mb-3 text-primary-600">Financer Details</h6>
                                            <div className="row">
                                                <InfoRow label="Financed" value={vehicle.financer_details.financed} />
                                                <InfoRow label="Financer Name" value={vehicle.financer_details.financerName} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RC Details */}
                        <div className="card radius-12 mb-4">
                            <div
                                className="card-header d-flex justify-content-between align-items-center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggle('rcDetails')}
                            >
                                <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                    <iconify-icon icon="ic:round-article" className="text-xl"></iconify-icon>
                                    Registration Certificate (RC)
                                </h6>
                                <iconify-icon
                                    icon={toggles.rcDetails ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                    className="text-xl text-primary-600"
                                ></iconify-icon>
                            </div>
                            {toggles.rcDetails && (
                                <div className="card-body p-24">
                                    <div className="row">
                                        <InfoRow label="RC Number" value={vehicle.registration_certificate?.rc_number} />
                                        <InfoRow label="Register Date" value={formatDate(vehicle.registration_certificate?.register_date)} />
                                        <InfoRow label="Fit Upto" value={formatDate(vehicle.registration_certificate?.fit_upto)} />
                                        <InfoRow label="RC Status" value={<Badge status={vehicle.registration_certificate?.rc_status} />} />
                                        <InfoRow label="Verified" value={
                                            vehicle.registration_certificate?.verified ?
                                                <span className="text-success-600">✓ Yes</span> :
                                                <span className="text-warning-600">⏱ Pending</span>
                                        } />
                                        <InfoRow label="Verified At" value={formatDateTime(vehicle.registration_certificate?.verified_at)} />
                                        <InfoRow label="Verified Via" value={vehicle.registration_certificate?.verified_via} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Insurance */}
                        <div className="card radius-12 mb-4">
                            <div
                                className="card-header d-flex justify-content-between align-items-center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggle('insurance')}
                            >
                                <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                    <iconify-icon icon="ic:round-security" className="text-xl"></iconify-icon>
                                    Insurance Details
                                </h6>
                                <iconify-icon
                                    icon={toggles.insurance ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                    className="text-xl text-primary-600"
                                ></iconify-icon>
                            </div>
                            {toggles.insurance && (
                                <div className="card-body p-24">
                                    <div className="row">
                                        <InfoRow label="Company Name" value={vehicle.insurance?.company_name} />
                                        <InfoRow label="Policy Number" value={vehicle.insurance?.policy_number} />
                                        <InfoRow label="Expiry Date" value={formatDate(vehicle.insurance?.expiry_date)} />
                                        <InfoRow label="Verified" value={
                                            vehicle.insurance?.verified ?
                                                <span className="text-success-600">✓ Yes</span> :
                                                <span className="text-warning-600">⏱ Pending</span>
                                        } />
                                        <InfoRow label="Verified At" value={formatDateTime(vehicle.insurance?.verified_at)} />
                                        <InfoRow label="Verified Via" value={vehicle.insurance?.verified_via} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Permit */}
                        {vehicle.permit && (
                            <div className="card radius-12 mb-4">
                                <div
                                    className="card-header d-flex justify-content-between align-items-center"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => toggle('permit')}
                                >
                                    <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                        <iconify-icon icon="ic:round-badge" className="text-xl"></iconify-icon>
                                        Permit Details
                                    </h6>
                                    <iconify-icon
                                        icon={toggles.permit ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                        className="text-xl text-primary-600"
                                    ></iconify-icon>
                                </div>
                                {toggles.permit && (
                                    <div className="card-body p-24">
                                        <div className="row">
                                            <InfoRow label="Permit Number" value={vehicle.permit.permit_number} />
                                            <InfoRow label="Permit Type" value={vehicle.permit.permit_type} />
                                            <InfoRow label="Issue Date" value={formatDate(vehicle.permit.issue_date)} />
                                            <InfoRow label="Valid From" value={formatDate(vehicle.permit.valid_from)} />
                                            <InfoRow label="Valid Upto" value={formatDate(vehicle.permit.valid_upto)} />
                                            <InfoRow label="Expiry Date" value={formatDate(vehicle.permit.expiry_date)} />
                                            <InfoRow label="Verified" value={
                                                vehicle.permit.verified ?
                                                    <span className="text-success-600">✓ Yes</span> :
                                                    <span className="text-warning-600">⏱ Pending</span>
                                            } />
                                            <div className="col-12">
                                                {vehicle.permit.document?.url && (
                                                    <a href={vehicle.permit.document.url} target="_blank" rel="noopener noreferrer" className="btn rounded-pill btn-primary-600 radius-8 px-20 py-11">
                                                        <iconify-icon icon="ic:round-image" className="me-2"></iconify-icon>
                                                        View Permit Document
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Vehicle Photos */}
                        {vehicle.vehicle_photos && (
                            <div className="card radius-12 mb-4">

                                {/* HEADER */}
                                <div
                                    className="card-header d-flex justify-content-between align-items-center"
                                    style={{ cursor: "pointer" }}
                                    onClick={() => toggle("vehiclePhotos")}
                                >
                                    <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                        <iconify-icon icon="ic:round-photo-camera" className="text-xl"></iconify-icon>
                                        Vehicle Photos
                                    </h6>
                        
                                    <iconify-icon
                                        icon={
                                            toggles.vehiclePhotos
                                                ? "ic:round-keyboard-arrow-up"
                                                : "ic:round-keyboard-arrow-down"
                                        }
                                        class="text-xl text-primary-600"
                                    ></iconify-icon>
                                </div>

                                {/* BODY */}
                                {toggles.vehiclePhotos && (
                                    <div className="card-body p-20">
                                        <div className="row g-4">

                                            {/* FRONT */}
                                            {vehicle.vehicle_photos.front?.url && (
                                                <div className="col-xxl-4 col-md-6">
                                                    <div className="card h-100 radius-12 overflow-hidden text-center p-16">
                                                        <img
                                                            src={vehicle.vehicle_photos.front.url}
                                                            alt="Front"
                                                            className="img-fluid rounded radius-12 mb-12"
                                                            style={{ maxHeight: "200px", objectFit: "cover" }}
                                                        />
                                                        <h6 className="text-primary-light fw-bold mb-0">Front View</h6>
                                                    </div>
                                                </div>
                                            )}

                                            {/* BACK */}
                                            {vehicle.vehicle_photos.back?.url && (
                                                <div className="col-xxl-4 col-md-6">
                                                    <div className="card h-100 radius-12 overflow-hidden text-center p-16">
                                                        <img
                                                            src={vehicle.vehicle_photos.back.url}
                                                            alt="Back"
                                                            className="img-fluid rounded radius-12 mb-12"
                                                            style={{ maxHeight: "200px", objectFit: "cover" }}
                                                        />
                                                        <h6 className="text-primary-light fw-bold mb-0">Back View</h6>
                                                    </div>
                                                </div>
                                            )}

                                            {/* INTERIOR */}
                                            {vehicle.vehicle_photos.interior?.url && (
                                                <div className="col-xxl-4 col-md-6">
                                                    <div className="card h-100 radius-12 overflow-hidden text-center p-16">
                                                        <img
                                                            src={vehicle.vehicle_photos.interior.url}
                                                            alt="Interior"
                                                            className="img-fluid rounded radius-12 mb-12"
                                                            style={{ maxHeight: "200px", objectFit: "cover" }}
                                                        />
                                                        <h6 className="text-primary-light fw-bold mb-0">Interior View</h6>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </>
                )}

                {/* Bank Details */}
                {bank._id && (
                    <div className="card basic-data-table mb-4">
                        <div
                            className="card-header d-flex justify-content-between align-items-center"
                            style={{ cursor: 'pointer' }}
                            onClick={() => toggle('bank')}
                        >
                            <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                <iconify-icon icon="ic:round-account-balance" className="me-2"></iconify-icon>
                                Bank Account Details
                            </h6>

                            <iconify-icon
                                icon={toggles.bank ? "ic:round-keyboard-arrow-up" : "ic:round-keyboard-arrow-down"}
                                className="text-xl"
                            ></iconify-icon>
                        </div>
                        {toggles.bank && (
                            <div className="card-body">
                                <div className="row">
                                    <InfoRow label="Bank Name" value={bank.bank_name} />
                                    <InfoRow label="Account Holder Name" value={bank.account_holder_name} />
                                    <InfoRow label="Account Number" value={
                                        <span className="font-monospace">
                                      {bank.account_number || ""}
                                        </span>
                                    } />
                                    <InfoRow label="IFSC Code" value={<span className="font-monospace">{bank.ifsc_code}</span>} />
                                    <InfoRow label="Branch Name" value={bank.branch_name} />
                                    <InfoRow label="Verified" value={
                                        bank.verified ?
                                            <span className="text-success-main fw-bold">✓ Verified</span> :
                                            <span className="text-warning-main fw-bold">⏱ Pending</span>
                                    } />
                                    <InfoRow label="Created At" value={formatDateTime(bank.createdAt)} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

         
                {/* Additional Information */}
                <div className="card basic-data-table mb-4">
                    <div className="card-header">
                          <h6 className="mb-0 text-sm fw-bold text-primary-light d-flex align-items-center gap-2">
                                        <iconify-icon icon="ic:round-info" className="text-xl"></iconify-icon>
                                       Additional Information
                                    </h6>
                      
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <InfoRow label="FCM Token" value={
                                d.fcm_token ?
                                    <span className="text-truncate d-inline-block" style={{ maxWidth: '300px' }}>
                                        {d.fcm_token}
                                    </span> :
                                    'N/A'
                            } className="col-12" />
                            <InfoRow label="Last Login OTP" value={d.loginOtp || 'N/A'} />
                            <InfoRow label="Login OTP Expiry" value={formatDateTime(d.loginOtpExpiry)} />
                            <InfoRow label="Aadhaar OTP" value={d.aadhar_otp || 'N/A'} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverView;