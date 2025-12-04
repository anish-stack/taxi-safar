import React, { useEffect, useState } from "react"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "./settings.css"

const Settings = () => {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState("")

  const BASE_URL = "https://test.taxi.olyox.in/api/v1/admin/settings"

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await axios.get(BASE_URL)
      const data = res.data.data
      setSettings(data)
      setForm(data)
      setLogoPreview(data.app_logo?.url || "")
    } catch (err) {
      toast.error("Failed to load settings")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Handle simple field changes
  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  // Handle nested object changes (support, social_media)
  const handleNestedChange = (section, key, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }))
  }

  // Handle payment gateway changes
  const handlePaymentChange = (gateway, field, value) => {
    setForm(prev => ({
      ...prev,
      payment_gateways: {
        ...prev.payment_gateways,
        [gateway]: { 
          ...prev.payment_gateways[gateway], 
          [field]: value 
        }
      }
    }))
  }

  // Handle logo file selection
  const handleLogoChange = e => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB")
        return
      }

      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      toast.info("Logo ready to upload")
    }
  }

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview("")
    setForm(prev => ({ ...prev, app_logo: null }))
    toast.info("Logo removed")
  }

  // Submit form
  const handleSubmit = async e => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const formData = new FormData()

      // Append all form fields
      Object.keys(form).forEach(key => {
        if (["payment_gateways", "support", "social_media"].includes(key)) {
          formData.append(key, JSON.stringify(form[key]))
        } else if (key !== "app_logo" && key !== "_id" && key !== "__v" && key !== "createdAt" && key !== "updatedAt") {
          formData.append(key, form[key])
        }
      })

      // Append logo if new file selected
      if (logoFile) {
        formData.append("logo", logoFile)
      }

      await axios.post(BASE_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      toast.success("✓ Settings saved successfully!")
      setLogoFile(null)
      fetchSettings()
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings")
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="settings-loader">
        <div className="settings-spinner"></div>
        <p>Loading settings...</p>
      </div>
    )
  }

  // Main render
  return (
    <>
      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <div className="settings-container">
        <div className="settings-card">
          {/* Header */}
          <div className="settings-header">
            <h4>App Settings</h4>
          </div>

          {/* Tabs Navigation */}
          <div className="settings-tabs">
            {[
              { id: "general", label: "General" },
              { id: "support", label: "Support" },
              { id: "social", label: "Social Media" },
              { id: "payment", label: "Payment" },
              { id: "versions", label: "App Versions" },
              { id: "policies", label: "Policies" }
            ].map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? "settings-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="settings-form">
            
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div className="settings-grid">
                <div className="settings-col">
                  <div className="settings-field">
                    <label>App Name</label>
                    <input
                      type="text"
                      name="app_name"
                      value={form.app_name || ""}
                      onChange={handleChange}
                      placeholder="Enter app name"
                      required
                    />
                  </div>

                  <div className="settings-field">
                    <label>Google Maps API Key</label>
                    <input
                      type="text"
                      name="google_maps_api_key"
                      value={form.google_maps_api_key || ""}
                      onChange={handleChange}
                      placeholder="AIzaSy..."
                    />
                  </div>

                  <div className="settings-field">
                    <label>Maintenance Mode</label>
                    <select
                      name="under_maintenance"
                      value={form.under_maintenance?.toString() || "false"}
                      onChange={e => handleChange({
                        target: {
                          name: e.target.name,
                          value: e.target.value === "true",
                          type: "select"
                        }
                      })}
                    >
                      <option value="false">Disabled</option>
                      <option value="true">Enabled</option>
                    </select>
                  </div>

                  {form.under_maintenance && (
                    <div className="settings-field">
                      <label>Maintenance Message</label>
                      <textarea
                        name="maintenance_message"
                        rows={4}
                        value={form.maintenance_message || ""}
                        onChange={handleChange}
                        placeholder="Enter maintenance message to display to users"
                      />
                    </div>
                  )}
                </div>

                {/* Logo Upload Section */}
                <div className="settings-col">
                  <div className="settings-upload-card">
                    <h6>App Logo</h6>
                    <div className="settings-upload-area">
                      {logoPreview ? (
                        <div className="settings-preview">
                          <img src={logoPreview} alt="App Logo" />
                          <button
                            type="button"
                            className="settings-remove-btn"
                            onClick={handleRemoveLogo}
                            title="Remove logo"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="settings-placeholder">
                          <span>📷 Upload Logo</span>
                          <small>Recommended: 512×512 PNG</small>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        id="logo-input"
                      />
                      <label htmlFor="logo-input" className="settings-upload-btn">
                        Choose File
                      </label>
                    </div>
                  </div>

                  <div className="settings-field">
                    <label>Android App Link</label>
                    <input
                      type="url"
                      name="app_link_android"
                      value={form.app_link_android || ""}
                      onChange={handleChange}
                      placeholder="https://play.google.com/store/apps/..."
                    />
                  </div>

                  <div className="settings-field">
                    <label>iOS App Link</label>
                    <input
                      type="url"
                      name="app_link_ios"
                      value={form.app_link_ios || ""}
                      onChange={handleChange}
                      placeholder="https://apps.apple.com/app/..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === "support" && (
              <div className="settings-grid">
                {form.support && Object.keys(form.support).map(key => (
                  <div key={key} className="settings-col">
                    <div className="settings-field">
                      <label>
                        {key.replace(/_/g, " ").split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </label>
                      <input
                        type={key === "email" ? "email" : key === "phone" ? "tel" : "url"}
                        value={form.support[key] || ""}
                        onChange={e => handleNestedChange("support", key, e.target.value)}
                        placeholder={
                          key === "email" ? "support@example.com" :
                          key === "phone" ? "+1 (555) 123-4567" :
                          "https://help.example.com"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SOCIAL MEDIA TAB */}
            {activeTab === "social" && (
              <div className="settings-grid">
                {form.social_media && Object.keys(form.social_media).map(key => (
                  <div key={key} className="settings-col">
                    <div className="settings-field">
                      <label>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <input
                        type="url"
                        placeholder={`https://${key}.com/yourapp`}
                        value={form.social_media[key] || ""}
                        onChange={e => handleNestedChange("social_media", key, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAYMENT GATEWAYS TAB */}
            {activeTab === "payment" && (
              <div className="settings-grid">
                {form.payment_gateways && Object.keys(form.payment_gateways).map(gateway => (
                  <div key={gateway} className="settings-gateway-card">
                    <h6>
                      {gateway.charAt(0).toUpperCase() + gateway.slice(1)}
                    </h6>
                    {Object.keys(form.payment_gateways[gateway]).map(field => (
                      <div key={field} className="settings-field">
                        {field === "enabled" ? (
                          <label className="settings-switch">
                            <input
                              type="checkbox"
                              checked={form.payment_gateways[gateway][field] || false}
                              onChange={e => handlePaymentChange(gateway, field, e.target.checked)}
                            />
                            <span className="settings-slider"></span>
                            Enable {gateway.charAt(0).toUpperCase() + gateway.slice(1)}
                          </label>
                        ) : (
                          <>
                            <label>
                              {field.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </label>
                            <input
                              type={field.includes('secret') || field.includes('key') ? "password" : "text"}
                              value={form.payment_gateways[gateway][field] || ""}
                              onChange={e => handlePaymentChange(gateway, field, e.target.value)}
                              placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                              disabled={!form.payment_gateways[gateway].enabled}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* APP VERSIONS TAB */}
            {activeTab === "versions" && (
              <div className="settings-grid">
                <div className="settings-col">
                  <div className="settings-field">
                    <label>Android Version</label>
                    <input
                      type="text"
                      name="app_version_android"
                      value={form.app_version_android || ""}
                      onChange={handleChange}
                      placeholder="1.0.0"
                    />
                  </div>
                  
                  <div className="settings-field">
                    <label>Force Update (Android)</label>
                    <select
                      name="force_update_android"
                      value={form.force_update_android?.toString() || "false"}
                      onChange={e => handleChange({
                        target: {
                          name: e.target.name,
                          value: e.target.value === "true",
                          type: "select"
                        }
                      })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>Android Rating Link</label>
                    <input
                      type="url"
                      name="app_rating_link_android"
                      value={form.app_rating_link_android || ""}
                      onChange={handleChange}
                      placeholder="https://play.google.com/store/apps/..."
                    />
                  </div>
                </div>
                
                <div className="settings-col">
                  <div className="settings-field">
                    <label>iOS Version</label>
                    <input
                      type="text"
                      name="app_version_ios"
                      value={form.app_version_ios || ""}
                      onChange={handleChange}
                      placeholder="1.0.0"
                    />
                  </div>
                  
                  <div className="settings-field">
                    <label>Force Update (iOS)</label>
                    <select
                      name="force_update_ios"
                      value={form.force_update_ios?.toString() || "false"}
                      onChange={e => handleChange({
                        target: {
                          name: e.target.name,
                          value: e.target.value === "true",
                          type: "select"
                        }
                      })}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>

                  <div className="settings-field">
                    <label>iOS Rating Link</label>
                    <input
                      type="url"
                      name="app_rating_link_ios"
                      value={form.app_rating_link_ios || ""}
                      onChange={handleChange}
                      placeholder="https://apps.apple.com/app/..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* POLICIES TAB */}
            {activeTab === "policies" && (
              <div className="settings-grid">
                {[
                  { name: "privacy_policy_url", label: "Privacy Policy URL" },
                  { name: "terms_conditions_url", label: "Terms & Conditions URL" },
                  { name: "refund_policy_url", label: "Refund Policy URL" }
                ].map(field => (
                  <div key={field.name} className="settings-col">
                    <div className="settings-field">
                      <label>{field.label}</label>
                      <input
                        type="url"
                        name={field.name}
                        value={form[field.name] || ""}
                        onChange={handleChange}
                        placeholder="https://yoursite.com/policy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <div className="settings-actions">
              <button
                type="submit"
                disabled={saving}
                className="settings-save-btn"
              >
                {saving ? "Saving..." : "💾 Save All Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default Settings