import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import {
  getPaymentStatusBadge,
  getRideStatusBadge,
} from "../../../utils/Badges";
import { calculateDistance } from "../../../utils/helpers";

const API_URL_APP_CHAT = `http://localhost:3200`;

const PostRidesView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openChatIndex, setOpenChatIndex] = useState(null); // For manual accordion
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `https://test.taxi.olyox.in/api/v1/post-rides/${id}`
        );
        if (response.data.success) {
          const [lon1, lat1] = response.data.data.pickupLocation?.coordinates;
          const [lon2, lat2] = response.data.data.dropLocation?.coordinates;

          setRide(response.data.data);
          const distanceFetch = await calculateDistance(lat1, lon1, lat2, lon2);
          setDistance(distanceFetch)
        } else {
          setError("Failed to load ride details");
        }
      } catch (err) {
        setError("Failed to load ride details. Please try again.");
        toast.error("Failed to load ride details");
      } finally {
        setLoading(false);
      }
    };

    const fetchChats = async () => {
      setChatLoading(true);
      try {
        const response = await axios.get(
          `${API_URL_APP_CHAT}/api/chat-ride/${id}`
        );
        if (response.data.success) {
          setChats(response.data.chats || []);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setChatLoading(false);
      }
    };

    if (id) {
      fetchRideDetails();
      fetchChats();
    }
  }, [id]);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
    });

  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDateTime = (date) =>
    new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const toggleChat = (index) => {
    setOpenChatIndex(openChatIndex === index ? null : index);
  };

  const InfoCard = ({
    icon,
    title,
    value,
    subValue,
    colorClass = "text-primary-main",
  }) => (
    <div className="card shadow-sm mb-20">
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div
            className={`w-48-px h-48-px rounded-circle bg-${
              colorClass.split("-")[1]
            }-focus d-flex align-items-center justify-content-center me-16`}
          >
            <iconify-icon
              icon={icon}
              className={`text-2xl ${colorClass}`}
            ></iconify-icon>
          </div>
          <div className="flex-grow-1">
            <p className="text-sm text-secondary-light mb-4">{title}</p>
            <h6 className="mb-0 fw-bold">{value}</h6>
            {subValue && <small className="text-muted">{subValue}</small>}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <iconify-icon
            icon="tabler:alert-circle"
            className="text-danger"
            style={{ fontSize: "48px" }}
          ></iconify-icon>
          <h5 className="mt-3 text-danger">{error || "Ride not found"}</h5>
          <button
            onClick={() => navigate("/bookings/post-rides")}
            className="btn btn-primary mt-3"
          >
            Back to Rides
          </button>
        </div>
      </div>
    );
  }

  const remainingAmount = ride.totalAmount - (ride.partialPaymentAmount || 0);

  return (
    <>
      {/* Custom CSS for Chat Messages */}
      <style jsx>{`
        .chat-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 12px;
          margin-bottom: 12px;
          word-wrap: break-word;
          white-space: pre-wrap;
        }
        .chat-sent {
          background: #e3f2fd;
          margin-left: auto;
          border-bottom-right-radius: 4px;
        }
        .chat-received {
          background: #fff;
          border: 1px solid #eee;
          margin-right: auto;
          border-bottom-left-radius: 4px;
        }
        .chat-time {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
        }
      `}</style>

      <div className="row">
        {/* Header */}
        <div className="col-12 mb-24">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-8">Ride Details</h4>
                  <p className="text-muted mb-0 d-flex align-items-center gap-2">
                    <span>
                      Ride ID:{" "}
                      <span className="fw-bold text-primary-600">
                        #{ride._id?.slice(-8)?.toUpperCase()}
                      </span>
                    </span>
                    <span className="ms-2">Status:</span>
                    <span>{getRideStatusBadge(ride.rideStatus)}</span>
                    {ride.rideStatus === "cancelled" && (
                      <span className="text-danger ms-2">(Cancelled)</span>
                    )}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => navigate("/bookings/post-rides")}
                    className="btn d-flex rounded-pill align-items-center btn-outline-secondary"
                  >
                    <iconify-icon
                      icon="lucide:arrow-left"
                      className="me-8"
                    ></iconify-icon>{" "}
                    Back
                  </button>
                  {["pending", "assigned"].includes(ride.rideStatus) && (
                    <button
                      onClick={() => navigate(`/post-rides/edit/${ride._id}`)}
                      className="btn btn-primary"
                    >
                      <iconify-icon
                        icon="lucide:edit"
                        className="me-8"
                      ></iconify-icon>{" "}
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-lg-8">
          {/* Route Information */}
          <div className="card mb-24">
            <div className="card-header">
              <h6 className="mb-0">Route Information</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-20">
                  <div className="d-flex">
                    <div className="me-12">
                      <div className="w-40-px h-40-px rounded-circle bg-success-focus d-flex align-items-center justify-content-center">
                        <iconify-icon
                          icon="material-symbols:location-on"
                          className="text-success-main text-xl"
                        ></iconify-icon>
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <p className="text-sm text-secondary-light mb-4">
                        Pickup Location
                      </p>
                      <h6 className="mb-8 text-md">{ride.pickupAddress}</h6>
                    </div>
                  </div>
                </div>
                <div className="col-md-6 mb-20">
                  <div className="d-flex">
                    <div className="me-12">
                      <div className="w-40-px h-40-px rounded-circle bg-danger-focus d-flex align-items-center justify-content-center">
                        <iconify-icon
                          icon="material-symbols:flag"
                          className="text-danger-main text-xl"
                        ></iconify-icon>
                      </div>
                    </div>
                    <div className="flex-grow-1">
                      <p className="text-sm text-secondary-light mb-4">
                        Drop Location
                      </p>
                      <h6 className="mb-8 text-md">{ride.dropAddress}</h6>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mt-20">
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Pickup Date
                  </p>
                  <h6 className="mb-0">{formatDate(ride.pickupDate)}</h6>
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Pickup Time
                  </p>
                  <h6 className="mb-0">{formatTime(ride.pickupTime)}</h6>
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">Trip Type</p>
                  <span className="px-16 py-6 rounded-pill text-sm fw-medium bg-info-focus text-info-main">
                    {ride.tripType === "one-way" ? "One Way" : "Round Trip"}
                  </span>
                </div>
                  <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">Distance / Time</p>
                  <span className="px-16 py-6 rounded-pill text-sm fw-medium bg-info-focus text-info-main">
                    {distance || 0}
                  </span>   
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Vehicle Type
                  </p>
                  <span className="px-16 py-6 rounded-pill text-sm fw-medium bg-primary-focus text-primary-main">
                    {ride.vehicleType.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ride post driver */}
          {ride.driverPostId && (
            <div className="card mb-24 border border-danger">
              <div className="card-header bg-danger-focus">
                <h6 className="mb-0 text-danger-main"> Driver Who Post</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">{ride.driverPostId.driver_name}</h6>
                    <p className="mb-1 text-muted">
                      +91 {ride.driverPostId.driver_contact_number}
                    </p>
                    <small>Post at : {formatDateTime(ride.createdAt)}</small>
                  </div>
                  <a
                    href={`/driver/view/${ride.driverPostId._id}`}
                    className="btn btn-sm btn-danger"
                  >
                    View Driver
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Driver */}
          {ride.assignedDriverId && (
            <div className="card mb-24 border border-success">
              <div className="card-header bg-success-focus">
                <h6 className="mb-0 text-success-main">Assigned Driver</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">
                      {ride.assignedDriverId.driver_name}
                    </h6>
                    <p className="mb-1 text-muted">
                      +91 {ride.assignedDriverId.driver_contact_number}
                    </p>
                    <small>
                      Assigned on: {formatDateTime(ride.assignedAt)}
                    </small>
                  </div>
                  <a
                    href={`/driver/view/${ride.assignedDriverId._id}`}
                    className="btn btn-sm btn-success"
                  >
                    View Driver
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Details */}
          {ride.rideStatus === "cancelled" && (
            <div className="card mb-24 border border-danger">
              <div className="card-header bg-danger-focus">
                <h6 className="mb-0 text-danger-main">Ride Cancelled</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-6">
                    <p className="text-sm text-secondary-light mb-4">
                      Cancelled By
                    </p>
                    <h6 className="mb-0">
                      {ride.cancelledByModel || "Unknown"}
                    </h6>
                  </div>
                  <div className="col-6">
                    <p className="text-sm text-secondary-light mb-4">
                      Cancelled At
                    </p>
                    <h6 className="mb-0">
                      {ride.cancelledAt
                        ? formatDateTime(ride.cancelledAt)
                        : "N/A"}
                    </h6>
                  </div>
                  <div className="col-12">
                    <p className="text-sm text-secondary-light mb-4">Reason</p>
                    <p className="mb-0">
                      {ride.cancellationReason || "No reason provided"}
                    </p>
                  </div>
                  {ride.cancellationFee > 0 && (
                    <div className="col-6">
                      <p className="text-sm text-secondary-light mb-4">
                        Cancellation Fee
                      </p>
                      <h6 className="mb-0 text-danger">
                        ₹{ride.cancellationFee}
                      </h6>
                    </div>
                  )}
                  {ride.refundAmount > 0 && (
                    <div className="col-6">
                      <p className="text-sm text-secondary-light mb-4">
                        Refunded Amount
                      </p>
                      <h6 className="mb-0 text-success">
                        ₹{ride.refundAmount}
                      </h6>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment & Earnings */}
          <div className="card mb-24">
            <div className="card-header">
              <h6 className="mb-0">Payment & Earnings</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Total Amount
                  </p>
                  <h4 className="mb-0 text-success-main">
                    ₹{ride.totalAmount.toLocaleString()}
                  </h4>
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Commission
                  </p>
                  <h5 className="mb-0 text-warning-main">
                    ₹{ride.commissionAmount.toLocaleString()}
                  </h5>
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Driver Earning
                  </p>
                  <h5 className="mb-0 text-primary-main">
                    ₹{ride.driverEarning.toLocaleString()}
                  </h5>
                </div>
                <div className="col-md-3 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Payment Status
                  </p>
                  {getPaymentStatusBadge(ride.paymentStatus)}
                </div>
              </div>

              {ride.partialPaymentAmount > 0 && (
                <div className="alert alert-info mt-20">
                  <strong>Partial Payment Received:</strong> ₹
                  {ride.partialPaymentAmount.toLocaleString()} |
                  <strong className="ms-3 text-danger">
                    Remaining: ₹{remainingAmount.toLocaleString()}
                  </strong>
                </div>
              )}

              <div className="row mt-3">
                <div className="col-md-4 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Payment Method
                  </p>
                  <span className="px-16 py-6 rounded-pill text-sm fw-medium bg-secondary-focus text-secondary-main">
                    {ride.paymentMethod.toUpperCase()}
                  </span>
                </div>
                <div className="col-md-4 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Extra KM Charge
                  </p>
                  <h6 className="mb-0">₹{ride.extraKmCharge}/km</h6>
                </div>
                <div className="col-md-4 col-6 mb-20">
                  <p className="text-sm text-secondary-light mb-8">
                    Extra Min Charge
                  </p>
                  <h6 className="mb-0">₹{ride.extraMinCharge}/min</h6>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Requirements & Notes */}
          <div className="card mb-24">
            <div className="card-header">
              <h6 className="mb-0">Extra Requirements</h6>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(ride.extraRequirements || {}).map(
                  ([key, value]) => (
                    <div key={key} className="col-md-4 col-6 mb-12">
                      <div
                        className={`p-12 rounded ${
                          value ? "bg-success-focus" : "bg-neutral-100"
                        }`}
                      >
                        <iconify-icon
                          icon={
                            value ? "lucide:check-circle" : "lucide:x-circle"
                          }
                          className={`me-8 ${
                            value ? "text-success-main" : "text-secondary-light"
                          }`}
                        ></iconify-icon>
                        <span
                          className={
                            value
                              ? "text-success-main fw-medium"
                              : "text-secondary-light"
                          }
                        >
                          {key
                            .replace(/([A-Z])/g, " $1")
                            .trim()
                            .split(" ")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {ride.notes && (
            <div className="card mb-24">
              <div className="card-header">
                <h6 className="mb-0">Additional Notes</h6>
              </div>
              <div className="card-body">
                <p className="mb-0">{ride.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-lg-4">
          <InfoCard
            icon="lucide:calendar"
            title="Posted On"
            value={formatDate(ride.createdAt)}
          />
          <InfoCard
            icon="lucide:refresh-cw"
            title="Last Updated"
            value={formatDate(ride.updatedAt)}
            colorClass="text-info-main"
          />
          <InfoCard
            icon="lucide:clock"
            title="Booking Type"
            value={
              ride.acceptBookingType === "instant"
                ? "Instant Booking"
                : "Scheduled"
            }
            colorClass="text-warning-main"
          />

          {/* Chat History Accordion */}
          <div className="card mb-24">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Chat History ({chats.length})</h6>
              {chatLoading && (
                <div className="spinner-border spinner-border-sm text-primary"></div>
              )}
            </div>
            <div className="card-body p-0">
              {chats.length === 0 ? (
                <div className="p-20 text-center text-muted">
                  No messages yet
                </div>
              ) : (
                chats.map((chat, index) => (
                  <div key={chat._id} className="border-bottom">
                    <div
                      className="d-flex justify-content-between align-items-center p-16 cursor-pointer hover-bg-primary-focus"
                      onClick={() => toggleChat(index)}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <iconify-icon
                          icon="lucide:message-circle"
                          className="text-primary"
                        ></iconify-icon>
                        <span className="text-sm fw-medium">
                          {chat.init_driver_id.driver_name} ↔{" "}
                          {chat.other_driver_id.driver_name}
                        </span>
                      </div>
                      <iconify-icon
                        icon={
                          openChatIndex === index
                            ? "lucide:chevron-up"
                            : "lucide:chevron-down"
                        }
                        className="text-muted"
                      ></iconify-icon>
                    </div>

                    {openChatIndex === index && (
                      <div className="px-16 pb-16">
                        {chat.messages.map((msg) => (
                          <div
                            key={msg._id}
                            className={`chat-bubble ${
                              msg.sender === ride.assignedDriverId?._id
                                ? "chat-sent"
                                : "chat-received"
                            }`}
                          >
                            <div className="text-sm">{msg.text}</div>
                            {msg.paymentUrl && (
                              <a
                                href={msg.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-primary mt-2"
                              >
                                Pay ₹{msg.amount}
                              </a>
                            )}
                            <div className="chat-time">
                              {formatDateTime(msg.sentAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PostRidesView;
