import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const Allcategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    screen: "",
    badge: "",
    position: 1,
    is_active: true,
    image: null,
  });

  const API_BASE = "http://localhost:3100/api/v1";

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/get-categories`);
      if (res.data.success) setCategories(res.data.data);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedCategory(null);
    setFormData({
      title: "",
      screen: "",
      badge: "",
      position: 1,
      is_active: true,
      image: null,
    });
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setIsEditMode(true);
    setSelectedCategory(cat);
    setFormData({
      title: cat.title || "",
      screen: cat.screen || "",
      badge: cat.badge || "",
      position: cat.position || 1,
      is_active: cat.is_active ?? true,
      image: null,
    });
    setImagePreview(cat.image?.url || null);
    setModalOpen(true);
  };

  const openDeleteModal = (cat) => {
    setSelectedCategory(cat);
    setDeleteModal(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setDeleteModal(false);
    setSelectedCategory(null);
    setImagePreview(null);
    setSubmitting(false);
    setDeleting(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.screen.trim()) {
      toast.error("Title and Screen are required");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("screen", formData.screen);
    data.append("badge", formData.badge);
    data.append("position", formData.position);
    data.append("is_active", formData.is_active);
    if (formData.image) data.append("image", formData.image);

    try {
      setSubmitting(true);
      let res;
      if (isEditMode) {
        res = await axios.put(
          `${API_BASE}/update-categories/${selectedCategory._id}`,
          data,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        res = await axios.post(`${API_BASE}/new-categories`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data.success) {
        toast.success(isEditMode ? "Category updated!" : "Category created!");
        fetchCategories();
        closeModal();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await axios.delete(
        `${API_BASE}/delete-categories/${selectedCategory._id}`
      );
      toast.success("Category deleted");
      setCategories((prev) =>
        prev.filter((c) => c._id !== selectedCategory._id)
      );
      closeModal();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            style={{ width: "3rem", height: "3rem" }}
          ></div>
          <p className="text-neutral-600 fw-medium">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid mt-5 py-4 px-9 pt-5 px-lg-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="h4 mb-0 fw-bold text-primary-light">
            All App Categories
          </h2>

          <button
            type="button"
            onClick={openAddModal}
            className="btn rounded-pill btn-outline-primary-600 radius-8 px-20 py-11"
          >
            Add New Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="card radius-12 border-0 shadow text-center p-5">
            <iconify-icon
              icon="solar:inbox-archive-bold-duotone"
              width="80"
              className="text-neutral-400"
            ></iconify-icon>
            <h5 className="mt-3 text-neutral-600">No categories found</h5>
            <button onClick={openAddModal} className="btn btn-primary mt-3">
              Create First Category
            </button>
          </div>
        ) : (
          <div className="row g-4">
            {categories.map((cat) => (
              <div key={cat._id} className="col-xxl-3 col-lg-4 col-md-6">
                <div className="card h-100 radius-12 border-0 shadow-sm hover-shadow">
                  <div className="card-body p-24 text-center position-relative">
                    <img
                      src={cat.image?.url || "https://via.placeholder.com/120"}
                      alt={cat.title}
                      className="rounded-circle border border-3 border-neutral-200 mb-3"
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                      }}
                    />
                    {cat.badge && (
                      <span className="badge bg-danger-focus text-danger-main px-12 py-6 position-absolute top-0 end-0 mt-3 me-3">
                        {cat.badge}
                      </span>
                    )}
                    <h5 className="mb-1 fw-bold text-primary-light">
                      {cat.title}
                    </h5>
                    <p className="text-neutral-600 text-sm mb-3">
                      Screen: {cat.screen}
                    </p>

                    <div className="d-flex justify-content-center gap-2 mb-3">
                      <span
                        className={`badge ${
                          cat.is_active
                            ? "bg-success-focus text-success-main"
                            : "bg-secondary-focus text-secondary-light"
                        } px-12 py-6`}
                      >
                        {cat.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="badge bg-info-focus text-info-main px-12 py-6">
                        Pos: {cat.position}
                      </span>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="btn btn-outline-primary flex-fill py-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(cat)}
                        className="btn btn-outline-danger flex-fill py-2"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-top text-center">
                      <small className="text-neutral-500">
                        {new Date(cat.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Add/Edit Modal */}
      {modalOpen && (
        <>
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content radius-16 bg-base border-0 shadow">
                <div className="modal-header py-16 px-24 border-bottom">
                  <h1 className="modal-title fs-5 fw-bold text-primary-light">
                    {isEditMode ? "Edit Category" : "Add New Category"}
                  </h1>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={submitting}
                  ></button>
                </div>

                <div className="modal-body p-24">
                  <div className="row gy-3">
                    {/* Image Upload */}
                    <div className="col-12">
                      <label className="form-label fw-medium">
                        Category Image
                      </label>
                      <div className="text-center">
                        <label
                          htmlFor="imageUpload"
                          className="d-block cursor-pointer"
                        >
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="rounded-circle border border-3 border-neutral-200"
                              style={{
                                width: "120px",
                                height: "120px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              className="border border-dashed border-neutral-300 radius-12 d-flex align-items-center justify-content-center flex-column"
                              style={{ height: "140px" }}
                            >
                              <iconify-icon
                                icon="solar:camera-bold"
                                width="40"
                                className="text-neutral-400"
                              ></iconify-icon>
                              <span className="text-neutral-500 mt-2">
                                Click to upload
                              </span>
                            </div>
                          )}
                        </label>
                        <input
                          id="imageUpload"
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleImageChange}
                          disabled={submitting}
                        />
                        {imagePreview && (
                          <button
                            onClick={() => {
                              setImagePreview(null);
                              setFormData((prev) => ({ ...prev, image: null }));
                            }}
                            className="btn btn-sm btn-outline-danger mt-2"
                            disabled={submitting}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Title</label>
                      <input
                        type="text"
                        name="title"
                        className="form-control radius-8"
                        placeholder="Enter title"
                        value={formData.title}
                        onChange={handleInputChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Screen Name</label>
                      <input
                        type="text"
                        name="screen"
                        className="form-control radius-8"
                        placeholder="e.g. home_services"
                        value={formData.screen}
                        onChange={handleInputChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Badge (Optional)</label>
                      <input
                        type="text"
                        name="badge"
                        className="form-control radius-8"
                        placeholder="e.g. New, Hot"
                        value={formData.badge}
                        onChange={handleInputChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Position</label>
                      <input
                        type="number"
                        name="position"
                        className="form-control radius-8"
                        min="1"
                        value={formData.position}
                        onChange={handleInputChange}
                        disabled={submitting}
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="activeSwitch"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          disabled={submitting}
                        />
                        <label
                          className="form-check-label fw-medium"
                          htmlFor="activeSwitch"
                        >
                          Category is Active
                        </label>
                      </div>
                    </div>

                    <div className="col-12 mt-4">
                      <button
                        onClick={handleSubmit}
                        className="btn btn-primary-600 w-100 py-12 radius-8 fw-bold d-flex align-items-center justify-content-center gap-2"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            <span>
                              {isEditMode ? "Updating..." : "Creating..."}
                            </span>
                          </>
                        ) : (
                          <span>
                            {isEditMode ? "Update Category" : "Create Category"}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteModal && selectedCategory && (
        <>
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content radius-16 bg-base border-0 shadow">
                <div className="modal-body p-24 text-center">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-focus mb-3"
                    style={{ width: "80px", height: "80px" }}
                  >
                    <iconify-icon
                      icon="solar:trash-bin-trash-bold"
                      width="40"
                      className="text-danger"
                    ></iconify-icon>
                  </div>
                  <h4 className="fw-bold text-danger">Delete Category?</h4>
                  <p className="text-neutral-600 mt-2">
                    Are you sure you want to delete "
                    <strong>{selectedCategory.title}</strong>"?
                    <br />
                    This action cannot be undone.
                  </p>
                  <div className="d-flex gap-3 justify-content-center mt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="btn rounded-pill btn-outline-secondary radius-8 px-20 py-11"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="btn rounded-pill btn-danger radius-8 px-20 py-11 d-flex align-items-center gap-2"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Yes, Delete</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </>
  );
};

export default Allcategories;