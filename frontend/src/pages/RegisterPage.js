import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import "./RegisterPage.css";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    emailPrefix: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: "",
    otherDepartment: "",
    year: "",
    graduationYear: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // overall submit loading
  const [otpLoading, setOtpLoading] = useState(false); // send OTP button loading
  const [verifyLoading, setVerifyLoading] = useState(false); // verify OTP button loading

  const { register, sendOtp, verifyOtp, checkUsername } = useAuth();
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // username availability: null (idle), true (available), false (taken)
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (!formData.emailPrefix || /@/.test(formData.emailPrefix)) {
      toast.error("Enter email prefix only (no @)");
      return;
    }
    setOtpLoading(true);
    try {
      const resp = await sendOtp(formData.emailPrefix.trim());
      if (resp.success) {
        setOtpSent(true);
        toast.success("OTP sent. Check your email.");
      } else {
        toast.error(resp.error || "Failed to send OTP");
      }
    } catch (e) {
      toast.error("Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setVerifyLoading(true);
    try {
      const resp = await verifyOtp(formData.emailPrefix.trim(), otpCode.trim());
      if (resp.success) {
        setEmailVerified(true);
        setFormData((prev) => ({
          ...prev,
          email: resp.data?.email || `${formData.emailPrefix}@mit.asia`,
        }));
        toast.success("Email verified");
      } else {
        toast.error(resp.error || "OTP verification failed");
      }
    } catch (e) {
      toast.error("OTP verification failed");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Debounced username availability check
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const u = formData.username.trim();
      if (!u || u.length < 3) {
        setUsernameAvailable(null);
        setUsernameSuggestions([]);
        return;
      }
      try {
        const resp = await checkUsername(u);
        if (resp.success) {
          // available true -> username free; false -> taken
          setUsernameAvailable(resp.available);
          setUsernameSuggestions(resp.suggestions || []);
        } else {
          // treat as unknown -> no message
          setUsernameAvailable(null);
          setUsernameSuggestions([]);
        }
      } catch {
        setUsernameAvailable(null);
        setUsernameSuggestions([]);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.username, checkUsername]);

  // Submit register (single-page validation)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Full Name is required");
      return;
    }
    if (!formData.emailPrefix.trim()) {
      setError("Email prefix is required");
      return;
    }
    if (!emailVerified) {
      setError("Please verify your email via OTP before registering");
      return;
    }
    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }
    if (usernameAvailable === false) {
      setError("Username already taken. Try another.");
      return;
    }
    if (
      !formData.department ||
      (formData.department === "Other" && !formData.otherDepartment.trim())
    ) {
      setError("Select department");
      return;
    }
    if (formData.role === "student" && !formData.year) {
      setError("Select year");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const finalEmail = `${formData.emailPrefix}@mit.asia`;
    setLoading(true);
    try {
      const result = await register({
        name: formData.name,
        username: formData.username,
        email: finalEmail,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        department:
          formData.department === "Other"
            ? formData.otherDepartment
            : formData.department,
        year: formData.role === "student" ? Number(formData.year) : undefined,
        graduationYear:
          formData.role === "alumni"
            ? Number(formData.graduationYear)
            : undefined,
      });
      if (result.success) {
        toast.success("Account created");
        navigate("/profile");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-content">
        <div className="register-form-container">
          <h2 className="register-title">Create Account</h2>
          <p className="register-subtitle">Join our alumni network today</p>

          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="register-error">{error}</div>}

            {/* Full Name */}
            <div className="register-field">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            {/* Institution Email + OTP */}
            <div className="register-field">
              <label>Institution Email</label>
              <div
                style={{ display: "flex", gap: "5px", alignItems: "center" }}
              >
                <input
                  type="text"
                  name="emailPrefix"
                  value={formData.emailPrefix}
                  onChange={(e) => {
                    if (e.target.value.includes("@")) return; // prevent typing @
                    handleChange(e);
                  }}
                  required
                  placeholder="email prefix"
                />
                <span>@mit.asia</span>
                {!emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    className="register-button"
                    style={{ padding: "8px 12px" }}
                  >
                    {otpLoading ? "Sending..." : "Send OTP"}
                  </button>
                )}
              </div>

              {otpSent && !emailVerified && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyLoading}
                    className="register-button"
                    style={{ padding: "8px 12px" }}
                  >
                    {verifyLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              )}

              {emailVerified && (
                <div className="register-success">Email verified</div>
              )}
            </div>

            {/* Username */}
            <div className="register-field">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
              {formData.username.trim() && usernameAvailable === false && (
                <div className="register-error">
                  Username already taken.{" "}
                  {usernameSuggestions.length > 0 &&
                    `Try: ${usernameSuggestions.join(", ")}`}
                </div>
              )}
              {formData.username.trim() && usernameAvailable === true && (
                <div className="register-success">Username available</div>
              )}
            </div>

            {/* Role */}
            <div className="register-field">
              <label>I am a</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="register-select"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            {/* Department */}
            <div className="register-field">
              <label>Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="register-select"
                required
              >
                <option value="">Select department</option>
                <option value="AI-DS">
                  Artificial Intelligence & Data Science
                </option>
                <option value="CSE">Computer Science and Enginnerring</option>
                <option value="Civil">Civil Engineering</option>
                <option value="Mechanical">Mechanical Engineering</option>
                <option value="ETC">Computer Science & Desgining</option>
                <option value="Other">Other</option>
              </select>
              {formData.department === "Other" && (
                <input
                  type="text"
                  name="otherDepartment"
                  placeholder="Enter your department"
                  value={formData.otherDepartment}
                  onChange={handleChange}
                  style={{ marginTop: "8px" }}
                />
              )}
            </div>

            {/* Conditional fields */}
            {formData.role === "student" && (
              <div className="register-field">
                <label>Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="register-select"
                  required
                >
                  <option value="">Select year</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="4">5</option>
                </select>
              </div>
            )}

            {formData.role === "alumni" && (
              <div className="register-field">
                <label>Graduation Year</label>
                <input
                  type="number"
                  name="graduationYear"
                  placeholder="e.g., 2022"
                  value={formData.graduationYear}
                  onChange={handleChange}
                  min="1950"
                  max="2099"
                  step="1"
                />
              </div>
            )}

            {/* Passwords */}
            <div className="register-field">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
              />
              <small>Min 6 characters. Use a mix for better security.</small>
            </div>

            <div className="register-field">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="register-login-link">
            Already have an account?{" "}
            <button
              type="button"
              className="register-link"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>
        </div>

        <div className="register-image-container">
          <div className={`register-image ${formData.role}`}>
            <div className="register-overlay">
              <h3>Welcome to MIT Alumni Network</h3>
              <p>Connect, Share, and Grow Together</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
