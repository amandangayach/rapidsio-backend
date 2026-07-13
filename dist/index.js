'use strict';

var dotenv = require('dotenv');
var cloudinary = require('cloudinary');
var express = require('express');
var cookieParser = require('cookie-parser');
var cors = require('cors');
var mongoose = require('mongoose');
var argon2 = require('argon2');
var jwt2 = require('jsonwebtoken');
var expressValidator = require('express-validator');
var nodemailer = require('nodemailer');
var multerStorageCloudinary = require('multer-storage-cloudinary');
var multer = require('multer');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var dotenv__default = /*#__PURE__*/_interopDefault(dotenv);
var express__default = /*#__PURE__*/_interopDefault(express);
var cookieParser__default = /*#__PURE__*/_interopDefault(cookieParser);
var cors__default = /*#__PURE__*/_interopDefault(cors);
var mongoose__default = /*#__PURE__*/_interopDefault(mongoose);
var argon2__default = /*#__PURE__*/_interopDefault(argon2);
var jwt2__default = /*#__PURE__*/_interopDefault(jwt2);
var nodemailer__default = /*#__PURE__*/_interopDefault(nodemailer);
var multer__default = /*#__PURE__*/_interopDefault(multer);

// src/index.ts
var EUserRole = /* @__PURE__ */ ((EUserRole2) => {
  EUserRole2["SUPER_ADMIN"] = "Super_Admin";
  EUserRole2["USER"] = "User";
  EUserRole2["ADMIN"] = "Admin";
  return EUserRole2;
})(EUserRole || {});
var UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: EUserRole,
    default: "User" /* USER */
  },
  password: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
var user_model_default = mongoose.model("User", UserSchema);
var sendTokenResponse = (user, statusCode, res, req) => {
  const userAgent = req.headers["user-agent"] || "unknown";
  const ipAddress = req.ip || req.connection.remoteAddress || "unknown";
  const token = jwt2__default.default.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      fingerprint: {
        userAgent: userAgent.substring(0, 100),
        // Limit length for security
        ip: ipAddress
      },
      // Adding version number for future JWT structure changes
      version: 1
    },
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "24h"
      // Longer expiry time to prevent frequent auth issues
    }
  );
  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1e3),
    // 24 hours
    httpOnly: true,
    secure: true,
    // Required for SameSite=None
    sameSite: "none",
    // Allow cross-site cookies in both environments
    path: "/"
    // Ensure cookie is sent for all paths
  };
  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    token,
    data: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email
    }
  });
};

// src/controllers/auth.controller.ts
var register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existingUser = await user_model_default.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const hashedPassword = await argon2__default.default.hash(password);
    const newUser = new user_model_default({
      name,
      email,
      password: hashedPassword,
      verified: false,
      role: "User"
    });
    await newUser.save();
    sendTokenResponse(newUser, 201, res, req);
  } catch (error) {
    res.status(500).json({ error: "Server error during registration" });
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const user = await user_model_default.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const passwordMatch = await argon2__default.default.verify(user.password, password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }
    if (!user.verified) {
      return res.status(403).json({ error: "Email not verified" });
    }
    sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
};
var logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  res.status(200).json({ message: "Logged out successfully" });
};
var refreshToken = (req, res) => {
  const refreshToken2 = req.cookies.refreshToken;
  if (!refreshToken2) {
    return res.status(401).json({ error: "No refresh token provided" });
  }
};
var getCurrentUser = async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "No user found" });
  }
  const userData = await user_model_default.findById(user.id).select("-password");
  res.status(200).json(userData);
};
var validateUserAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt2__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.verified) {
      return res.status(403).json({ error: "User not verified" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
var validateAdminAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt2__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role !== "Admin" /* ADMIN */ && user.role !== "Super_Admin" /* SUPER_ADMIN */) {
      return res.status(403).json({ error: "Access denied" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
var validateSuperAdminAccess = async (req, res, next) => {
  try {
    let token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt2__default.default.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await user_model_default.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.role !== "Super_Admin" /* SUPER_ADMIN */) {
      return res.status(403).json({ error: "Super admin access required" });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    res.status(400).json({ error: "Invalid token" });
  }
};
var authRouter = express.Router();
authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/refresh", refreshToken);
authRouter.get("/me", validateUserAccess, getCurrentUser);
authRouter.post("/logout", logout);
var auth_routes_default = authRouter;
var createTransporter = () => {
  return nodemailer__default.default.createTransport({
    service: "gmail",
    // You can change this to other services
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
      // Use app password for Gmail
    }
  });
};
var sendOrderNotificationEmail = async (formData) => {
  try {
    const transporter = createTransporter();
    const emailContent = `
      <h2>New Assignment Order Received</h2>
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>Order Details:</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Email:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.email}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Phone:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.countryCode} ${formData.phoneNumber}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Subject/Course Code:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.subjectCode}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Deadline:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.deadline}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Pages:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.pages}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Description:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.description}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Terms Accepted:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${formData.acceptTerms ? "Yes" : "No"}</td>
          </tr>
          ${formData.attachments && formData.attachments.length > 0 ? `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Attached Files:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">
              ${formData.attachments.map((file) => `
                <div style="margin-bottom: 8px;">
                  <a href="${file.url}" target="_blank" style="color: #0066cc; text-decoration: none;">
                    ${file.name} (${(file.size / 1024).toFixed(2)} KB)
                  </a>
                </div>
              `).join("")}
            </td>
          </tr>
          ` : ""}
        </table>
        
        <p style="margin-top: 20px;"><strong>Submitted on:</strong> ${(/* @__PURE__ */ new Date()).toLocaleString()}</p>
      </div>
    `;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFICATION_EMAIL || process.env.EMAIL_USER,
      subject: `New Assignment Order - ${formData.subjectCode}`,
      html: emailContent
    };
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
var generateWhatsAppMessage = (formData) => {
  const message = `
*New Assignment Order*

*Order ID:* ${formData.orderId || "Pending"}
*Email:* ${formData.email}
*Phone:* ${formData.countryCode} ${formData.phoneNumber}
*Subject/Course:* ${formData.subjectCode}
*Deadline:* ${formData.deadline}
*Pages:* ${formData.pages}

*Description:*
${formData.description}

${formData.attachments && formData.attachments.length > 0 ? `
\u{1F4CE} *Attached Files:*
${formData.attachments.map((file) => `- ${file.name} (${(file.size / 1024).toFixed(2)} KB)
${file.url}`).join("\n")}` : ""}
*Submitted:* ${(/* @__PURE__ */ new Date()).toLocaleString()}

Please provide a quote for this assignment.
  `.trim();
  return encodeURIComponent(message);
};
var generateWhatsAppURL = (formData) => {
  const whatsappNumber = process.env.WHATSAPP_NUMBER || "+447346056050";
  const message = generateWhatsAppMessage(formData);
  return `https://wa.me/${whatsappNumber}?text=${message}`;
};

// src/controllers/order.controller.ts
var validateOrderSubmission = [
  expressValidator.body("email").isEmail().withMessage("Please provide a valid email address").normalizeEmail(),
  expressValidator.body("countryCode").notEmpty().withMessage("Country code is required"),
  expressValidator.body("phoneNumber").notEmpty().withMessage("Phone number is required").isLength({ min: 6, max: 15 }).withMessage("Phone number must be between 6 and 15 digits"),
  expressValidator.body("subjectCode").notEmpty().withMessage("Subject/Course code is required").isLength({ min: 2, max: 100 }).withMessage("Subject code must be between 2 and 100 characters"),
  expressValidator.body("description").notEmpty().withMessage("Description is required").isLength({ min: 10, max: 2e3 }).withMessage("Description must be between 10 and 2000 characters"),
  expressValidator.body("deadline").notEmpty().withMessage("Deadline is required"),
  expressValidator.body("pages").notEmpty().withMessage("Number of pages is required").isNumeric().withMessage("Pages must be a number").isInt({ min: 1, max: 1e3 }).withMessage("Pages must be between 1 and 1000"),
  expressValidator.body("acceptTerms").isBoolean().withMessage("Terms acceptance must be a boolean").custom((value) => {
    if (!value) {
      throw new Error("You must accept the terms and conditions");
    }
    return true;
  }),
  expressValidator.body("attachedFile").optional().isString().withMessage("Attached file must be a string")
];
var submitOrder = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const orderData = req.body;
    const attachments = req.files || [];
    const fileUrls = attachments.map((file) => ({
      url: file.path,
      name: file.originalname,
      size: file.size,
      type: file.mimetype
    }));
    const enrichedOrderData = {
      ...orderData,
      attachments: fileUrls,
      orderId: generateOrderId()
      // Generate order ID for tracking
    };
    const emailSent = await sendOrderNotificationEmail(enrichedOrderData);
    const whatsappURL = generateWhatsAppURL(enrichedOrderData);
    res.status(200).json({
      success: true,
      message: "Order submitted successfully",
      data: {
        whatsappURL,
        emailSent,
        // confirmationSent,
        orderId: enrichedOrderData.orderId,
        // Use the same order ID
        attachments: fileUrls
      }
    });
  } catch (error) {
    console.error("Error submitting order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error : void 0
    });
  }
};
var generateOrderId = () => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `ODR-${timestamp}-${randomPart}`.toUpperCase();
};
var testEmailService = async (req, res) => {
  try {
    const testData = {
      email: "test@example.com",
      countryCode: "+44",
      phoneNumber: "1234567890",
      subjectCode: "TEST-001",
      description: "This is a test order submission to verify email functionality.",
      deadline: "7 days",
      pages: "5",
      acceptTerms: true,
      attachments: [
        {
          url: "https://res.cloudinary.com/example/test-document.pdf",
          name: "test-document.pdf",
          size: 1024,
          type: "application/pdf"
        }
      ]
    };
    const emailSent = await sendOrderNotificationEmail(testData);
    res.status(200).json({
      success: true,
      message: "Email service test completed",
      data: {
        emailSent,
        testData
      }
    });
  } catch (error) {
    console.error("Error testing email service:", error);
    res.status(500).json({
      success: false,
      message: "Email service test failed",
      error: process.env.NODE_ENV === "development" ? error : void 0
    });
  }
};
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var createStorageConfig = (folderPath, allowedFormats, resourceType = "auto") => {
  return new multerStorageCloudinary.CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: {
      folder: `convert-spaces/${folderPath}`,
      allowed_formats: allowedFormats,
      resource_type: resourceType,
      public_id: (req, file) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomString}-${file.originalname.replace(/\s+/g, "-")}`;
      },
      access_mode: "public",
      transformation: [{ quality: "auto:good" }]
      // Automatic quality optimization
    }
  });
};
var clientStorage = createStorageConfig(
  "client-documents",
  ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"]
);
var blogStorage = createStorageConfig(
  "content/blogs",
  ["jpg", "jpeg", "png", "gif", "webp", "html", "md"],
  "raw"
);
var sampleStorage = createStorageConfig(
  "content/samples",
  ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "html", "md"],
  "raw"
);
var serviceStorage = createStorageConfig(
  "content/services",
  ["jpg", "jpeg", "png", "gif", "webp", "html", "md", "json"],
  "raw"
);
var testimonialStorage = createStorageConfig(
  "images/testimonials",
  ["jpg", "jpeg", "png", "gif", "webp"],
  "image"
);
var imageAssetsStorage = createStorageConfig(
  "images/assets",
  ["jpg", "jpeg", "png", "gif", "webp", "svg"],
  "image"
);
var caseStudyStorage = createStorageConfig(
  "images/case-studies",
  ["jpg", "jpeg", "png", "gif", "webp"],
  "image"
);
var createUploadMiddleware = (storage, allowedFormats) => {
  return multer__default.default({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE
    },
    fileFilter: (req, file, callback) => {
      const extension = file.originalname.split(".").pop()?.toLowerCase();
      if (!extension || !allowedFormats.includes(extension)) {
        console.log(`Rejected file: ${file.originalname}, extension: ${extension}, allowed: ${allowedFormats.join(", ")}`);
        return callback(new Error(`Invalid file type. Allowed types: ${allowedFormats.join(", ")}`));
      }
      callback(null, true);
    }
  });
};
var clientUploadMiddleware = createUploadMiddleware(clientStorage, ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"]);
var blogUploadMiddleware = createUploadMiddleware(blogStorage, ["jpg", "jpeg", "png", "gif", "webp", "html", "md"]);
var sampleUploadMiddleware = createUploadMiddleware(sampleStorage, ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "html", "md"]);
var serviceUploadMiddleware = createUploadMiddleware(serviceStorage, ["jpg", "jpeg", "png", "gif", "webp", "html", "md", "json"]);
var testimonialUploadMiddleware = createUploadMiddleware(testimonialStorage, ["jpg", "jpeg", "png", "gif", "webp"]);
var imageAssetsUploadMiddleware = createUploadMiddleware(imageAssetsStorage, ["jpg", "jpeg", "png", "gif", "webp", "svg"]);
var caseStudyUploadMiddleware = createUploadMiddleware(caseStudyStorage, ["jpg", "jpeg", "png", "gif", "webp"]);
var handleUploadError = (err, res) => {
  console.error("Upload error:", err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      error: "FILE_TOO_LARGE"
    });
  }
  return res.status(400).json({
    success: false,
    message: err.message,
    error: "UPLOAD_ERROR"
  });
};
var createOptionalUploadMiddleware = (middleware) => {
  return (fieldName) => (req, res, next) => {
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next();
    }
    middleware.single(fieldName)(req, res, (err) => {
      if (err) return handleUploadError(err, res);
      next();
    });
  };
};
var upload = {
  client: {
    single: (fieldName) => clientUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 10) => {
      return (req, res, next) => {
        clientUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => clientUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(clientUploadMiddleware)
  },
  blog: {
    single: (fieldName) => blogUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        blogUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => blogUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(blogUploadMiddleware)
  },
  sample: {
    single: (fieldName) => sampleUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        sampleUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    optional: createOptionalUploadMiddleware(sampleUploadMiddleware)
  },
  service: {
    single: (fieldName) => serviceUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        serviceUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => serviceUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(serviceUploadMiddleware)
  },
  testimonial: {
    single: (fieldName) => testimonialUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        testimonialUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => testimonialUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(testimonialUploadMiddleware)
  },
  imageAssets: {
    single: (fieldName) => imageAssetsUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 10) => {
      return (req, res, next) => {
        imageAssetsUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => imageAssetsUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(imageAssetsUploadMiddleware)
  },
  caseStudy: {
    single: (fieldName) => caseStudyUploadMiddleware.single(fieldName),
    array: (fieldName, maxCount = 5) => {
      return (req, res, next) => {
        caseStudyUploadMiddleware.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields) => caseStudyUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(caseStudyUploadMiddleware)
  }
};
var cloudinaryUtils = {
  // Delete a file from Cloudinary
  deleteFile: async (publicId, resourceType = "image") => {
    try {
      const result = await cloudinary.v2.uploader.destroy(publicId, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      throw error;
    }
  },
  // Delete multiple files from Cloudinary
  deleteFiles: async (publicIds, resourceType = "image") => {
    try {
      const result = await cloudinary.v2.api.delete_resources(publicIds, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error("Error deleting files from Cloudinary:", error);
      throw error;
    }
  },
  // Delete image asset by public ID (specific for image assets)
  deleteImageAsset: async (publicId) => {
    try {
      const result = await cloudinary.v2.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true
        // Invalidate CDN cache
      });
      return result;
    } catch (error) {
      console.error("Error deleting image asset from Cloudinary:", error);
      throw error;
    }
  },
  // Delete multiple image assets by public IDs (specific for image assets)
  deleteImageAssets: async (publicIds) => {
    try {
      const result = await cloudinary.v2.api.delete_resources(publicIds, {
        resource_type: "image",
        invalidate: true
        // Invalidate CDN cache
      });
      return result;
    } catch (error) {
      console.error("Error bulk deleting image assets from Cloudinary:", error);
      throw error;
    }
  },
  // Extract public ID from Cloudinary URL
  getPublicIdFromUrl: (url) => {
    try {
      const regex = /(convert-spaces|str-dra|ping-assignments)\/[^?]+/;
      const match = url.match(regex);
      return match ? match[0] : "";
    } catch (error) {
      console.error("Error extracting public ID from URL:", error);
      return "";
    }
  },
  // Generate a Cloudinary URL with transformations
  generateUrl: (publicId, options = {}) => {
    try {
      return cloudinary.v2.url(publicId, options);
    } catch (error) {
      console.error("Error generating Cloudinary URL:", error);
      return "";
    }
  },
  // Get details about a file
  getFileDetails: async (publicId, resourceType = "image") => {
    try {
      const result = await cloudinary.v2.api.resource(publicId, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error("Error getting file details from Cloudinary:", error);
      throw error;
    }
  },
  // Create a zip archive of multiple files
  createArchive: async (publicIds, options = {}) => {
    try {
      const result = await cloudinary.v2.utils.download_zip_url({
        public_ids: publicIds,
        ...options
      });
      return result;
    } catch (error) {
      console.error("Error creating archive from Cloudinary:", error);
      throw error;
    }
  },
  // Get resource usage statistics
  getUsageStats: async () => {
    try {
      const result = await cloudinary.v2.api.usage();
      return result;
    } catch (error) {
      console.error("Error getting Cloudinary usage stats:", error);
      throw error;
    }
  }
};
var getPublicIdFromUrl = cloudinaryUtils.getPublicIdFromUrl;

// src/routers/order.routes.ts
var orderRouter = express.Router();
orderRouter.post(
  "/submit",
  upload.client.array("attachments", 5),
  // Allow up to 5 file attachments
  validateOrderSubmission,
  submitOrder
);
if (process.env.NODE_ENV === "development") {
  orderRouter.post("/test-email", testEmailService);
}
var order_routes_default = orderRouter;

// src/types/blogCategories.ts
var BlogCategories = [
  "Positioning",
  "Web Design",
  "CRO",
  "Case Studies",
  "Agency Insights",
  "Web Engineering",
  "B2B Buying Journey ",
  "Brand Identity"
];

// src/models/blog.model.ts
var EBlogStatus = /* @__PURE__ */ ((EBlogStatus2) => {
  EBlogStatus2["DRAFT"] = "Draft";
  EBlogStatus2["PUBLISHED"] = "Published";
  EBlogStatus2["ARCHIVED"] = "Archived";
  return EBlogStatus2;
})(EBlogStatus || {});
var BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  subtitle: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  contentUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: BlogCategories,
    required: true
  },
  datePublished: {
    type: Date
  },
  authorName: {
    type: String,
    required: true
  },
  tableOfContents: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  readTime: {
    type: Number
  },
  status: {
    type: String,
    enum: EBlogStatus,
    default: "Draft" /* DRAFT */
  },
  ctaSection: {
    title: {
      type: String
    },
    content: {
      type: String
    }
  },
  readMore: {
    title: {
      type: String
    },
    content: {
      type: String
    },
    link: {
      type: String
    }
  },
  faqs: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  }]
}, {
  timestamps: true
});
var blog_model_default = mongoose.model("Blog", BlogSchema);
var createBlog = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const { title, subtitle, description, content, tags, authorName, tableOfContents, ctaSection, readMore, views, category, faqs } = req.body;
    const creator = req.user._id;
    const slug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
    console.log("Generated slug:", slug);
    const existingBlog = await blog_model_default.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        success: false,
        message: "A blog with this title already exists"
      });
    }
    let contentUrl;
    if (content) {
      if (content.startsWith("http")) {
        contentUrl = content;
      } else {
        const publicId = `convert-spaces/content/blogs/${slug}-content.md`;
        try {
          const uploadResult = await cloudinary.v2.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString("base64")}`, {
            resource_type: "raw",
            public_id: publicId,
            overwrite: true,
            invalidate: true
          });
          contentUrl = uploadResult.secure_url;
        } catch (error) {
          console.error("Error uploading content to Cloudinary:", error);
          return res.status(500).json({
            success: false,
            message: "Error uploading content"
          });
        }
      }
    }
    const files = req.files;
    const thumbnailFile = files?.thumbnail?.[0];
    const thumbnailUrl = thumbnailFile ? thumbnailFile.path : void 0;
    const words = content.split(/\s+/).length;
    const readTime = Math.ceil(words / 200);
    const blog = new blog_model_default({
      title,
      subtitle,
      description,
      slug,
      content,
      contentUrl,
      thumbnailUrl,
      creator,
      authorName: authorName || req.user.name,
      tags,
      category,
      readTime,
      tableOfContents: tableOfContents ? JSON.parse(tableOfContents) : void 0,
      ctaSection: ctaSection ? (() => {
        const parsed = JSON.parse(ctaSection);
        return parsed.title && parsed.content ? parsed : void 0;
      })() : void 0,
      readMore: readMore ? JSON.parse(readMore) : void 0,
      faqs: faqs ? JSON.parse(faqs) : void 0,
      status: "Draft" /* DRAFT */,
      views: views ? parseInt(views) : 0
    });
    await blog.save();
    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error creating blog",
      error: process.env.NODE_ENV === "development" ? error : void 0
    });
  }
};
var getBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const tag = req.query.tag;
    const category = req.query.category;
    const search = req.query.search;
    const query = {};
    const user = req.user;
    if (user?.role === "Admin" || user?.role === "Super_Admin") {
      if (status) query.status = status;
    } else {
      query.status = "Published" /* PUBLISHED */;
    }
    if (tag) query.tags = tag;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const blogs = await blog_model_default.find(query).populate("creator", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await blog_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs"
    });
  }
};
var getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await blog_model_default.findOne({ slug }).populate("creator", "name email");
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    if (blog.status !== "Published" /* PUBLISHED */) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this blog"
      });
    }
    blog.views = (blog.views || 0) + 1;
    await blog.save();
    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog"
    });
  }
};
var getBlogByIdForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blog_model_default.findById(id).populate("creator", "name email");
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blog"
    });
  }
};
var updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, content, tags, status, authorName, tableOfContents, ctaSection, readMore, views, category, faqs } = req.body;
    const blog = await blog_model_default.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    const user = req.user;
    if (!user || !user._id || !blog.creator) {
      return res.status(403).json({
        success: false,
        message: "Invalid user or blog data"
      });
    }
    if (user._id.toString() !== blog.creator.toString() && user.role !== "Admin" && user.role !== "Super_Admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this blog"
      });
    }
    if (title && title !== blog.title) {
      const newSlug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const existingBlog = await blog_model_default.findOne({
        slug: newSlug,
        _id: { $ne: id }
      });
      if (existingBlog) {
        return res.status(400).json({
          success: false,
          message: "A blog with this title already exists"
        });
      }
      blog.slug = newSlug;
    }
    console.log("=== CONTENT UPDATE DEBUG ===");
    console.log("Incoming content:", content ? content.substring(0, 100) + "..." : "undefined");
    console.log("Existing contentUrl:", blog.contentUrl);
    console.log("Content starts with http:", content ? content.startsWith("http") : "N/A");
    let contentUrl = blog.contentUrl;
    if (content !== void 0 && content !== blog.contentUrl && !content.startsWith("http")) {
      console.log("Content has changed, uploading to Cloudinary...");
      const publicId = `convert-spaces/content/blogs/${blog.slug}-content.md`;
      console.log("Using publicId:", publicId);
      try {
        const uploadResult = await cloudinary.v2.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString("base64")}`, {
          resource_type: "raw",
          public_id: publicId,
          overwrite: true,
          invalidate: true
        });
        contentUrl = uploadResult.secure_url;
        console.log("New contentUrl:", contentUrl);
      } catch (error) {
        console.error("Error uploading content to Cloudinary:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading content"
        });
      }
    } else {
      console.log("Content unchanged or is already a URL, keeping existing contentUrl");
    }
    if (contentUrl !== blog.contentUrl) {
      console.log("Updating contentUrl from", blog.contentUrl, "to", contentUrl);
      blog.contentUrl = contentUrl;
    } else {
      console.log("contentUrl unchanged");
    }
    const files = req.files;
    const thumbnailFile = files?.thumbnail?.[0];
    if (thumbnailFile) {
      if (blog.thumbnailUrl) {
        const oldThumbnailPublicId = cloudinaryUtils.getPublicIdFromUrl(blog.thumbnailUrl);
        await cloudinaryUtils.deleteFile(oldThumbnailPublicId);
      }
      blog.thumbnailUrl = thumbnailFile.path;
    }
    blog.title = title || blog.title;
    blog.subtitle = subtitle || blog.subtitle;
    blog.description = description || blog.description;
    blog.tags = tags || blog.tags;
    blog.category = category || blog.category;
    blog.authorName = authorName || blog.authorName || user.name;
    if (views !== void 0) {
      blog.views = parseInt(views) || 0;
    }
    if (tableOfContents !== void 0) {
      blog.tableOfContents = typeof tableOfContents === "string" ? JSON.parse(tableOfContents) : tableOfContents;
    }
    if (ctaSection !== void 0) {
      const parsedCtaSection = typeof ctaSection === "string" ? JSON.parse(ctaSection) : ctaSection;
      if (parsedCtaSection && parsedCtaSection.title && parsedCtaSection.content) {
        blog.ctaSection = parsedCtaSection;
      } else if (parsedCtaSection && (!parsedCtaSection.title || !parsedCtaSection.content)) {
        blog.ctaSection = void 0;
      }
    }
    if (readMore !== void 0) {
      blog.readMore = typeof readMore === "string" ? JSON.parse(readMore) : readMore;
    }
    if (faqs !== void 0) {
      blog.faqs = typeof faqs === "string" ? JSON.parse(faqs) : faqs;
    }
    if (status && (user.role === "Admin" || user.role === "Super_Admin")) {
      blog.status = status;
      if (status === "Published" /* PUBLISHED */ && !blog.datePublished) {
        blog.datePublished = /* @__PURE__ */ new Date();
      }
    }
    if (content) {
      const words = content.split(/\s+/).length;
      blog.readTime = Math.ceil(words / 200);
    }
    await blog.save();
    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog
    });
  } catch (error) {
    console.error("Error updating blog:", error);
    res.status(500).json({
      success: false,
      message: "Error updating blog"
    });
  }
};
var archiveBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blog_model_default.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    blog.status = "Archived" /* ARCHIVED */;
    await blog.save();
    res.status(200).json({
      success: true,
      message: "Blog archived successfully"
    });
  } catch (error) {
    console.error("Error archiving blog:", error);
    res.status(500).json({
      success: false,
      message: "Error archiving blog"
    });
  }
};
var toggleBlogStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blog_model_default.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    if (blog.status === "Archived" /* ARCHIVED */) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of archived blog"
      });
    }
    const newStatus = blog.status === "Published" /* PUBLISHED */ ? "Draft" /* DRAFT */ : "Published" /* PUBLISHED */;
    const updatedBlog = await blog_model_default.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false,
        // Skip validation since we're only updating status
        select: "_id status"
        // Only select the fields we need
      }
    );
    if (!updatedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Blog status toggled successfully",
      data: {
        _id: updatedBlog._id,
        status: updatedBlog.status
      }
    });
  } catch (error) {
    console.error("Error toggling blog status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling blog status"
    });
  }
};
var deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await blog_model_default.findById(id);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found"
      });
    }
    if (blog.contentUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(blog.contentUrl);
      await cloudinaryUtils.deleteFile(publicId, "raw");
    }
    if (blog.thumbnailUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(blog.thumbnailUrl);
      await cloudinaryUtils.deleteFile(publicId);
    }
    await blog.deleteOne();
    res.status(200).json({
      success: true,
      message: "Blog deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting blog"
    });
  }
};
var getBlogStats = async (req, res) => {
  try {
    const stats = await blog_model_default.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const tagStats = await blog_model_default.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const categoryStats = await blog_model_default.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        popularTags: tagStats,
        popularCategories: categoryStats
      }
    });
  } catch (error) {
    console.error("Error getting blog stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting blog stats"
    });
  }
};
var getAllBlogsForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tag = req.query.tag;
    const category = req.query.category;
    const search = req.query.search;
    const query = {};
    if (tag) query.tags = tag;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const blogs = await blog_model_default.find(query).populate("creator", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await blog_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        blogs,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching all blogs for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blogs"
    });
  }
};
var validateBlog = [
  expressValidator.body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 200 }).withMessage("Title must be between 3 and 200 characters"),
  expressValidator.body("subtitle").optional().trim().isLength({ min: 0, max: 300 }).withMessage("Subtitle must be less than 300 characters"),
  expressValidator.body("description").trim().notEmpty().withMessage("Description is required").isLength({ min: 5, max: 750 }).withMessage("Description must be between 5 and 750 characters"),
  expressValidator.body("content").trim().notEmpty().withMessage("Content is required").isLength({ min: 10 }).withMessage("Content must be at least 10 characters").optional(),
  expressValidator.body("category").optional().isIn(BlogCategories).withMessage(`Category must be one of: ${BlogCategories.join(", ")}`),
  expressValidator.body("tags").optional().customSanitizer((value) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        return [];
      }
    }
    return Array.isArray(value) ? value : [];
  }).custom((value) => {
    if (!Array.isArray(value)) {
      throw new Error("Tags must be an array");
    }
    if (value.some((tag) => typeof tag !== "string" || tag.length < 2 || tag.length > 50)) {
      throw new Error("Each tag must be a string between 2 and 50 characters");
    }
    return true;
  })
];

// src/routers/blog.routes.ts
var blogRouter = express.Router();
blogRouter.get("/", getBlogs);
blogRouter.get("/slug/:slug", getBlogBySlug);
blogRouter.post(
  "/create",
  validateAdminAccess,
  upload.blog.fields([
    { name: "thumbnail", maxCount: 1 }
  ]),
  validateBlog,
  createBlog
);
blogRouter.put(
  "/:id",
  validateAdminAccess,
  upload.blog.fields([
    { name: "thumbnail", maxCount: 1 }
  ]),
  validateBlog,
  updateBlog
);
blogRouter.get("/admin/all", validateAdminAccess, getAllBlogsForAdmin);
blogRouter.get("/admin/:id", validateAdminAccess, getBlogByIdForAdmin);
blogRouter.get("/stats", validateAdminAccess, getBlogStats);
blogRouter.patch("/:id/archive", validateAdminAccess, archiveBlog);
blogRouter.patch("/:id/toggle-status", validateAdminAccess, toggleBlogStatus);
blogRouter.delete("/:id", validateSuperAdminAccess, deleteBlog);
var blog_routes_default = blogRouter;
var EServiceStatus = /* @__PURE__ */ ((EServiceStatus2) => {
  EServiceStatus2["DRAFT"] = "Draft";
  EServiceStatus2["LIVE"] = "Live";
  EServiceStatus2["INACTIVE"] = "Inactive";
  EServiceStatus2["COMING_SOON"] = "Coming_Soon";
  return EServiceStatus2;
})(EServiceStatus || {});
var ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String, required: true },
    slug: { type: String, required: true },
    order: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(EServiceStatus),
      required: true
    },
    featuresHeading: { type: String, required: true },
    features: [
      {
        icon: { type: String, required: true },
        title: { type: String, required: true },
        content: { type: String, required: true }
      }
    ],
    about: {
      title: { type: String, required: true },
      content: { type: String, required: true },
      backgroundImage: { type: String, required: true }
    },
    servicesHeading: { type: String, required: true },
    services: [
      {
        title: { type: String, required: true },
        imageUrl: { type: String, required: true },
        content: { type: String, required: true }
      }
    ],
    processHeading: { type: String, required: true },
    processDescription: { type: String },
    process: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        imageUrl: { type: String, required: true }
      }
    ],
    whyChooseUsHeading: { type: String, required: true },
    whyChooseUsDescription: { type: String },
    whyChooseUs: [
      {
        icon: { type: String, required: true },
        title: { type: String, required: true },
        content: { type: String, required: true }
      }
    ],
    areasHeading: { type: String, required: true },
    areasDescription: { type: String },
    areas: [
      {
        title: { type: String, required: true },
        imageUrl: { type: String, required: true }
      }
    ],
    faqsHeading: { type: String },
    faqsDescription: { type: String },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);
var Service = mongoose.model("Service", ServiceSchema);

// src/controllers/service.controller.ts
var createService = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const {
      title,
      subtitle,
      description,
      featuresHeading,
      about,
      features,
      servicesHeading,
      services,
      processHeading,
      processDescription,
      process: process2,
      whyChooseUsHeading,
      whyChooseUsDescription,
      whyChooseUs,
      areasHeading,
      areasDescription,
      areas,
      faqsHeading,
      faqsDescription,
      faqs,
      order
    } = req.body;
    const files = req.files;
    let aboutData = about;
    if (files.backgroundImage && files.backgroundImage[0]) {
      aboutData = {
        ...about,
        backgroundImage: files.backgroundImage[0].path
      };
    }
    let servicesData = services;
    if (files.servicesImages && Array.isArray(services) && files.servicesImages.length > 0) {
      servicesData = services.map((service2, index) => ({
        ...service2,
        imageUrl: files.servicesImages[index]?.path || service2.imageUrl
      }));
    }
    let processData = process2;
    if (files.processImages && Array.isArray(process2) && files.processImages.length > 0) {
      processData = process2.map((step, index) => ({
        ...step,
        imageUrl: files.processImages[index]?.path || step.imageUrl
      }));
    }
    let areasData = areas;
    if (files.areasImages && Array.isArray(areas) && files.areasImages.length > 0) {
      areasData = areas.map((area, index) => ({
        ...area,
        imageUrl: files.areasImages[index]?.path || area.imageUrl
      }));
    }
    const slug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
    const existingService = await Service.findOne({ slug });
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: "A service with this title already exists"
      });
    }
    const service = new Service({
      title,
      subtitle,
      description,
      slug,
      featuresHeading,
      about: aboutData,
      features,
      servicesHeading,
      services: servicesData,
      processHeading,
      processDescription,
      process: processData,
      whyChooseUsHeading,
      whyChooseUsDescription,
      whyChooseUs,
      areasHeading,
      areasDescription,
      areas: areasData,
      faqsHeading,
      faqsDescription,
      faqs,
      order: order || 0,
      status: "Draft" /* DRAFT */
      // Default status
    });
    await service.save();
    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service
    });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({
      success: false,
      message: "Error creating service"
    });
  }
};
var getServices = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit;
    const limit = limitParam ? parseInt(limitParam) : void 0;
    const query = {};
    const user = req.user;
    if (user?.role === "Admin" || user?.role === "Super_Admin") {
      if (status) query.status = status;
    } else {
      query.status = "Live" /* LIVE */;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    let servicesQuery = Service.find(query).sort("order");
    if (limit) {
      servicesQuery = servicesQuery.skip((page - 1) * limit).limit(limit);
    }
    const services = await servicesQuery;
    const total = await Service.countDocuments(query);
    const responseData = {
      services
    };
    if (limit) {
      responseData.pagination = {
        current: page,
        total: Math.ceil(total / limit),
        totalItems: total
      };
    } else {
      responseData.totalItems = total;
    }
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching services"
    });
  }
};
var getServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const service = await Service.findOne({ slug });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    if (service.status !== "Live" /* LIVE */) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service"
    });
  }
};
var updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      featuresHeading,
      about,
      features,
      servicesHeading,
      services,
      processHeading,
      processDescription,
      process: process2,
      whyChooseUsHeading,
      whyChooseUsDescription,
      whyChooseUs,
      areasHeading,
      areasDescription,
      areas,
      faqsHeading,
      faqsDescription,
      faqs,
      order,
      status
    } = req.body;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    const files = req.files;
    let aboutData = about;
    if (files.backgroundImage && files.backgroundImage[0]) {
      aboutData = {
        ...about,
        backgroundImage: files.backgroundImage[0].path
      };
    } else if (req.body.backgroundImage) {
      aboutData = {
        ...about,
        backgroundImage: req.body.backgroundImage
      };
    } else if (about) {
      aboutData = {
        ...about,
        backgroundImage: service.about.backgroundImage
      };
    }
    let servicesData = services;
    if (Array.isArray(services)) {
      let fileIndex = 0;
      servicesData = services.map((serviceItem, index) => {
        let imageUrl = serviceItem.imageUrl;
        if (!imageUrl && files.servicesImages && files.servicesImages[fileIndex]) {
          imageUrl = files.servicesImages[fileIndex].path;
          fileIndex++;
        } else if (req.body.servicesImages && req.body.servicesImages[index]) {
          imageUrl = req.body.servicesImages[index];
        } else if (!imageUrl && service.services[index]) {
          imageUrl = service.services[index].imageUrl;
        }
        if (!imageUrl) {
          throw new Error(`Image URL is required for services item at index ${index}. Please provide an image file or URL.`);
        }
        return { ...serviceItem, imageUrl };
      });
    }
    let processData = process2;
    if (Array.isArray(process2)) {
      let fileIndex = 0;
      processData = process2.map((step, index) => {
        let imageUrl = step.imageUrl;
        if (!imageUrl && files.processImages && files.processImages[fileIndex]) {
          imageUrl = files.processImages[fileIndex].path;
          fileIndex++;
        } else if (req.body.processImages && req.body.processImages[index]) {
          imageUrl = req.body.processImages[index];
        } else if (!imageUrl && service.process[index]) {
          imageUrl = service.process[index].imageUrl;
        }
        if (!imageUrl) {
          throw new Error(`Image URL is required for process item at index ${index}. Please provide an image file or URL.`);
        }
        return { ...step, imageUrl };
      });
    }
    let areasData = areas;
    if (Array.isArray(areas)) {
      let fileIndex = 0;
      areasData = areas.map((area, index) => {
        let imageUrl = area.imageUrl;
        if (!imageUrl && files.areasImages && files.areasImages[fileIndex]) {
          imageUrl = files.areasImages[fileIndex].path;
          fileIndex++;
        } else if (req.body.areasImages && req.body.areasImages[index]) {
          imageUrl = req.body.areasImages[index];
        } else if (!imageUrl && service.areas[index]) {
          imageUrl = service.areas[index].imageUrl;
        }
        if (!imageUrl) {
          throw new Error(`Image URL is required for areas item at index ${index}. Please provide an image file or URL.`);
        }
        return { ...area, imageUrl };
      });
    }
    if (title && title !== service.title) {
      const newSlug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const existingService = await Service.findOne({
        slug: newSlug,
        _id: { $ne: id }
      });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: "A service with this title already exists"
        });
      }
      service.slug = newSlug;
    }
    if (title !== void 0) service.title = title;
    if (subtitle !== void 0) service.subtitle = subtitle;
    if (description !== void 0) service.description = description;
    if (featuresHeading !== void 0) service.featuresHeading = featuresHeading;
    if (aboutData !== void 0) service.about = aboutData;
    if (features !== void 0) service.features = features;
    if (servicesHeading !== void 0) service.servicesHeading = servicesHeading;
    if (servicesData !== void 0) service.services = servicesData;
    if (processHeading !== void 0) service.processHeading = processHeading;
    if (processDescription !== void 0) service.processDescription = processDescription;
    if (processData !== void 0) service.process = processData;
    if (whyChooseUsHeading !== void 0) service.whyChooseUsHeading = whyChooseUsHeading;
    if (whyChooseUsDescription !== void 0) service.whyChooseUsDescription = whyChooseUsDescription;
    if (whyChooseUs !== void 0) service.whyChooseUs = whyChooseUs;
    if (areasHeading !== void 0) service.areasHeading = areasHeading;
    if (areasDescription !== void 0) service.areasDescription = areasDescription;
    if (areasData !== void 0) service.areas = areasData;
    if (faqsHeading !== void 0) service.faqsHeading = faqsHeading;
    if (faqsDescription !== void 0) service.faqsDescription = faqsDescription;
    if (faqs !== void 0) service.faqs = faqs;
    if (order !== void 0) service.order = order;
    if (status !== void 0) service.status = status;
    await service.save();
    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({
      success: false,
      message: "Error updating service"
    });
  }
};
var deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    const imageUrls = [];
    if (service.about?.backgroundImage) {
      imageUrls.push(service.about.backgroundImage);
    }
    if (service.services && Array.isArray(service.services)) {
      service.services.forEach((s) => {
        if (s.imageUrl) imageUrls.push(s.imageUrl);
      });
    }
    if (service.process && Array.isArray(service.process)) {
      service.process.forEach((p) => {
        if (p.imageUrl) imageUrls.push(p.imageUrl);
      });
    }
    if (service.areas && Array.isArray(service.areas)) {
      service.areas.forEach((a) => {
        if (a.imageUrl) imageUrls.push(a.imageUrl);
      });
    }
    if (imageUrls.length > 0) {
      try {
        const publicIds = imageUrls.map((url) => cloudinaryUtils.getPublicIdFromUrl(url)).filter(Boolean);
        if (publicIds.length > 0) {
          const deleteResult = await cloudinaryUtils.deleteFiles(publicIds, "raw");
        }
      } catch (error) {
        console.error("Error deleting images from Cloudinary:", error);
      }
    }
    await service.deleteOne();
    res.status(200).json({
      success: true,
      message: "Service deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting service"
    });
  }
};
var getServiceByIdForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error("Error fetching service by ID for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching service"
    });
  }
};
var getAllServicesForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const services = await Service.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await Service.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        services,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching all services for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching services"
    });
  }
};
var toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    if (service.status === "Inactive" /* INACTIVE */ || service.status === "Coming_Soon" /* COMING_SOON */) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of inactive or coming soon service"
      });
    }
    const newStatus = service.status === "Live" /* LIVE */ ? "Draft" /* DRAFT */ : "Live" /* LIVE */;
    const updatedService = await Service.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false,
        // Skip validation since we're only updating status
        select: "_id status"
        // Only select the fields we need
      }
    );
    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Service not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Service status toggled successfully",
      data: {
        _id: updatedService._id,
        status: updatedService.status
      }
    });
  } catch (error) {
    console.error("Error toggling service status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling service status"
    });
  }
};
var getServiceStats = async (req, res) => {
  try {
    const stats = await Service.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    res.status(200).json({
      success: true,
      data: {
        statusStats: stats
      }
    });
  } catch (error) {
    console.error("Error getting service stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting service stats"
    });
  }
};
[
  expressValidator.body("name").trim().notEmpty().withMessage("Section name is required").isLength({ min: 3, max: 100 }).withMessage("Section name must be between 3 and 100 characters"),
  expressValidator.body("description").optional().trim().isLength({ max: 500 }).withMessage("Description must not exceed 500 characters"),
  expressValidator.body("order").optional().isInt({ min: 0 }).withMessage("Order must be a non-negative integer"),
  expressValidator.body("icon").optional()
];
var validateService = [
  expressValidator.body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 200 }).withMessage("Title must be between 3 and 200 characters"),
  expressValidator.body("subtitle").optional().trim().isLength({ max: 300 }).withMessage("Subtitle must not exceed 300 characters"),
  expressValidator.body("description").trim().notEmpty().withMessage("Description is required").isLength({ min: 10, max: 1e3 }).withMessage("Description must be between 10 and 1000 characters"),
  expressValidator.body("about").optional().isObject().withMessage("About must be an object").custom((value) => {
    if (!value.title || typeof value.title !== "string" || value.title.length < 1 || value.title.length > 200) {
      throw new Error("About title is required and must be between 1 and 200 characters");
    }
    if (!value.content || typeof value.content !== "string" || value.content.length < 1 || value.content.length > 2e3) {
      throw new Error("About content is required and must be between 1 and 2000 characters");
    }
    if (value.backgroundImage && (typeof value.backgroundImage !== "string" || !value.backgroundImage.startsWith("http"))) {
      throw new Error("About backgroundImage must be a valid URL if provided");
    }
    return true;
  }),
  expressValidator.body("features").optional().isArray().withMessage("Features must be an array").custom((value) => {
    if (!Array.isArray(value)) return false;
    value.forEach((feature, index) => {
      if (typeof feature !== "object" || !feature) {
        throw new Error(`Feature at index ${index} must be an object`);
      }
      if (!feature.icon || typeof feature.icon !== "string" || feature.icon.length < 1) {
        throw new Error(`Feature at index ${index} must have a valid icon`);
      }
      if (!feature.title || typeof feature.title !== "string" || feature.title.length < 1 || feature.title.length > 100) {
        throw new Error(`Feature at index ${index} title must be between 1 and 100 characters`);
      }
      if (!feature.content || typeof feature.content !== "string" || feature.content.length < 1 || feature.content.length > 500) {
        throw new Error(`Feature at index ${index} content must be between 1 and 500 characters`);
      }
    });
    return true;
  }),
  expressValidator.body("services").optional().isArray().withMessage("Services must be an array").custom((value) => {
    if (!Array.isArray(value)) return false;
    value.forEach((service, index) => {
      if (typeof service !== "object" || !service) {
        throw new Error(`Service at index ${index} must be an object`);
      }
      if (!service.title || typeof service.title !== "string" || service.title.length < 1 || service.title.length > 100) {
        throw new Error(`Service at index ${index} title must be between 1 and 100 characters`);
      }
      if (service.imageUrl && (typeof service.imageUrl !== "string" || !service.imageUrl.startsWith("http"))) {
        throw new Error(`Service at index ${index} imageUrl must be a valid URL if provided`);
      }
      if (!service.content || typeof service.content !== "string" || service.content.length < 1 || service.content.length > 1e3) {
        throw new Error(`Service at index ${index} content must be between 1 and 1000 characters`);
      }
    });
    return true;
  }),
  expressValidator.body("process").optional().isArray().withMessage("Process must be an array").custom((value) => {
    if (!Array.isArray(value)) return false;
    value.forEach((step, index) => {
      if (typeof step !== "object" || !step) {
        throw new Error(`Process step at index ${index} must be an object`);
      }
      if (!step.title || typeof step.title !== "string" || step.title.length < 1 || step.title.length > 100) {
        throw new Error(`Process step at index ${index} title must be between 1 and 100 characters`);
      }
      if (!step.content || typeof step.content !== "string" || step.content.length < 1 || step.content.length > 1e3) {
        throw new Error(`Process step at index ${index} content must be between 1 and 1000 characters`);
      }
      if (step.imageUrl && (typeof step.imageUrl !== "string" || !step.imageUrl.startsWith("http"))) {
        throw new Error(`Process step at index ${index} imageUrl must be a valid URL if provided`);
      }
    });
    return true;
  }),
  expressValidator.body("whyChooseUs").optional().isArray().withMessage("WhyChooseUs must be an array").custom((value) => {
    if (!Array.isArray(value)) return false;
    value.forEach((item, index) => {
      if (typeof item !== "object" || !item) {
        throw new Error(`WhyChooseUs item at index ${index} must be an object`);
      }
      if (!item.title || typeof item.title !== "string" || item.title.length < 1 || item.title.length > 100) {
        throw new Error(`WhyChooseUs item at index ${index} title must be between 1 and 100 characters`);
      }
      if (!item.content || typeof item.content !== "string" || item.content.length < 1 || item.content.length > 500) {
        throw new Error(`WhyChooseUs item at index ${index} content must be between 1 and 500 characters`);
      }
    });
    return true;
  }),
  expressValidator.body("areas").optional().isArray().withMessage("Areas must be an array").custom((value) => {
    if (!Array.isArray(value)) return false;
    value.forEach((area, index) => {
      if (typeof area !== "object" || !area) {
        throw new Error(`Area at index ${index} must be an object`);
      }
      if (!area.title || typeof area.title !== "string" || area.title.length < 1 || area.title.length > 100) {
        throw new Error(`Area at index ${index} title must be between 1 and 100 characters`);
      }
      if (area.imageUrl && (typeof area.imageUrl !== "string" || !area.imageUrl.startsWith("http"))) {
        throw new Error(`Area at index ${index} imageUrl must be a valid URL if provided`);
      }
    });
    return true;
  }),
  expressValidator.body("order").optional().isInt({ min: 0 }).withMessage("Order must be a non-negative integer")
];
[
  expressValidator.body("question").trim().notEmpty().withMessage("Question is required").isLength({ min: 5, max: 500 }).withMessage("Question must be between 5 and 500 characters"),
  expressValidator.body("answer").trim().notEmpty().withMessage("Answer is required").isLength({ min: 10, max: 2e3 }).withMessage("Answer must be between 10 and 2000 characters"),
  expressValidator.body("order").optional().isInt({ min: 0 }).withMessage("Order must be a non-negative integer")
];

// src/routers/service.routes.ts
var serviceRouter = express.Router();
serviceRouter.post(
  "/",
  validateAdminAccess,
  upload.service.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "servicesImages", maxCount: 10 },
    { name: "processImages", maxCount: 10 },
    { name: "areasImages", maxCount: 10 }
  ]),
  validateService,
  createService
);
serviceRouter.get("/", getServices);
serviceRouter.get("/slug/:slug", getServiceBySlug);
serviceRouter.put(
  "/:id",
  validateAdminAccess,
  upload.service.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "servicesImages", maxCount: 10 },
    { name: "processImages", maxCount: 10 },
    { name: "areasImages", maxCount: 10 }
  ]),
  validateService,
  updateService
);
serviceRouter.get("/admin/all", validateAdminAccess, getAllServicesForAdmin);
serviceRouter.get("/admin/:id", validateAdminAccess, getServiceByIdForAdmin);
serviceRouter.get("/stats", validateAdminAccess, getServiceStats);
serviceRouter.patch("/:id/toggle-status", validateAdminAccess, toggleServiceStatus);
serviceRouter.delete(
  "/:id",
  validateSuperAdminAccess,
  deleteService
);
var service_routes_default = serviceRouter;
var FAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
});
var ESampleStatus = /* @__PURE__ */ ((ESampleStatus2) => {
  ESampleStatus2["DRAFT"] = "Draft";
  ESampleStatus2["PUBLISHED"] = "Published";
  ESampleStatus2["ARCHIVED"] = "Archived";
  return ESampleStatus2;
})(ESampleStatus || {});
var SampleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  contentUrl: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    // Subject from Subjects array
    required: true,
    index: true
  },
  topic: {
    type: String
  },
  academicLevel: {
    type: String
  },
  wordCount: {
    type: Number
  },
  referenceCount: {
    type: Number
  },
  faqs: [FAQSchema],
  status: {
    type: String,
    enum: ESampleStatus,
    default: "Draft" /* DRAFT */
  }
}, {
  timestamps: true
});
var sample_model_default = mongoose.model("Sample", SampleSchema);
var createSample = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const {
      title,
      subtitle,
      description,
      content,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs
    } = req.body;
    const slug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
    const existingSample = await sample_model_default.findOne({ slug });
    if (existingSample) {
      return res.status(400).json({
        success: false,
        message: "A sample with this title already exists"
      });
    }
    let contentUrl;
    if (content) {
      if (content.startsWith("http")) {
        contentUrl = content;
      } else {
        const publicId = `content/samples/${slug}-content.md`;
        try {
          const uploadResult = await cloudinary.v2.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString("base64")}`, {
            resource_type: "raw",
            public_id: publicId,
            folder: "ping-assignments/content/samples"
          });
          contentUrl = uploadResult.secure_url;
        } catch (error) {
          console.error("Error uploading content to Cloudinary:", error);
          return res.status(500).json({
            success: false,
            message: "Error uploading content"
          });
        }
      }
    }
    const sample = new sample_model_default({
      title,
      subtitle,
      description,
      slug,
      contentUrl,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs,
      status: "Draft" /* DRAFT */
    });
    await sample.save();
    res.status(201).json({
      success: true,
      message: "Sample created successfully",
      data: sample
    });
  } catch (error) {
    console.error("Error creating sample:", error);
    res.status(500).json({
      success: false,
      message: "Error creating sample"
    });
  }
};
var getSamples = async (req, res) => {
  try {
    const {
      subject,
      topic,
      academicLevel,
      status = "Published" /* PUBLISHED */,
      sort = "rating"
    } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = {};
    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (academicLevel) query.academicLevel = academicLevel;
    const user = req.user;
    if (user?.role === "Admin" || user?.role === "Super_Admin") {
      if (status) query.status = status;
    } else {
      query.status = "Published" /* PUBLISHED */;
    }
    let sortQuery = {};
    switch (sort) {
      case "rating":
        sortQuery = { "rating.score": -1 };
        break;
      case "recent":
        sortQuery = { createdAt: -1 };
        break;
      case "views":
        sortQuery = { views: -1 };
        break;
      default:
        sortQuery = { "rating.score": -1 };
    }
    const samples = await sample_model_default.find(query).sort(sortQuery).skip((page - 1) * limit).limit(limit);
    const total = await sample_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        samples,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching samples:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching samples"
    });
  }
};
var getSampleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const sample = await sample_model_default.findOne({ slug });
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    const user = req.user;
    if (sample.status !== "Published" /* PUBLISHED */ && user?.role !== "Admin" && user?.role !== "Super_Admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this sample"
      });
    }
    res.status(200).json({
      success: true,
      data: sample
    });
  } catch (error) {
    console.error("Error fetching sample:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sample"
    });
  }
};
var updateSample = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      content,
      subject,
      topic,
      academicLevel,
      wordCount,
      referenceCount,
      faqs,
      status
    } = req.body;
    const sample = await sample_model_default.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    if (title && title !== sample.title) {
      const newSlug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const existingSample = await sample_model_default.findOne({
        slug: newSlug,
        _id: { $ne: id }
      });
      if (existingSample) {
        return res.status(400).json({
          success: false,
          message: "A sample with this title already exists"
        });
      }
      sample.slug = newSlug;
    }
    let contentUrl = content;
    if (content !== void 0 && content !== sample.content && !content.startsWith("http")) {
      const publicId = `content/samples/${sample.slug}-content.md`;
      try {
        const uploadResult = await cloudinary.v2.uploader.upload(`data:text/markdown;base64,${Buffer.from(content).toString("base64")}`, {
          resource_type: "raw",
          public_id: publicId,
          folder: "ping-assignments/content/samples"
        });
        contentUrl = uploadResult.secure_url;
        if (sample.contentUrl && sample.contentUrl.startsWith("http")) {
          const oldPublicId = cloudinaryUtils.getPublicIdFromUrl(sample.contentUrl);
          await cloudinaryUtils.deleteFile(oldPublicId, "raw");
        }
      } catch (error) {
        console.error("Error uploading content to Cloudinary:", error);
        return res.status(500).json({
          success: false,
          message: "Error uploading content"
        });
      }
    }
    if (contentUrl !== void 0) {
      sample.contentUrl = contentUrl;
    }
    sample.title = title || sample.title;
    sample.subtitle = subtitle || sample.subtitle;
    sample.description = description || sample.description;
    sample.subject = subject || sample.subject;
    sample.topic = topic || sample.topic;
    sample.academicLevel = academicLevel || sample.academicLevel;
    sample.wordCount = wordCount || sample.wordCount;
    sample.referenceCount = referenceCount || sample.referenceCount;
    sample.faqs = faqs || sample.faqs;
    const user = req.user;
    if (status && (user?.role === "Admin" || user?.role === "Super_Admin")) {
      sample.status = status;
    }
    await sample.save();
    res.status(200).json({
      success: true,
      message: "Sample updated successfully",
      data: sample
    });
  } catch (error) {
    console.error("Error updating sample:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sample"
    });
  }
};
var deleteSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await sample_model_default.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    if (sample.contentUrl) {
      const publicId = cloudinaryUtils.getPublicIdFromUrl(sample.contentUrl);
      await cloudinaryUtils.deleteFile(publicId, "raw");
    }
    await sample.deleteOne();
    res.status(200).json({
      success: true,
      message: "Sample deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting sample:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting sample"
    });
  }
};
var getSampleByIdForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await sample_model_default.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    res.status(200).json({
      success: true,
      data: sample
    });
  } catch (error) {
    console.error("Error fetching sample:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sample"
    });
  }
};
var archiveSample = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await sample_model_default.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    sample.status = "Archived" /* ARCHIVED */;
    await sample.save();
    res.status(200).json({
      success: true,
      message: "Sample archived successfully"
    });
  } catch (error) {
    console.error("Error archiving sample:", error);
    res.status(500).json({
      success: false,
      message: "Error archiving sample"
    });
  }
};
var toggleSampleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const sample = await sample_model_default.findById(id);
    if (!sample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    if (sample.status === "Archived" /* ARCHIVED */) {
      return res.status(400).json({
        success: false,
        message: "Cannot toggle status of archived sample"
      });
    }
    const newStatus = sample.status === "Published" /* PUBLISHED */ ? "Draft" /* DRAFT */ : "Published" /* PUBLISHED */;
    const updatedSample = await sample_model_default.findByIdAndUpdate(
      id,
      { status: newStatus },
      {
        new: true,
        runValidators: false,
        select: "_id status"
      }
    );
    if (!updatedSample) {
      return res.status(404).json({
        success: false,
        message: "Sample not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Sample status toggled successfully",
      data: {
        _id: updatedSample._id,
        status: updatedSample.status
      }
    });
  } catch (error) {
    console.error("Error toggling sample status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling sample status"
    });
  }
};
var getAllSamplesForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const subject = req.query.subject;
    const topic = req.query.topic;
    const academicLevel = req.query.academicLevel;
    const search = req.query.search;
    const query = {};
    if (subject) query.subject = subject;
    if (topic) query.topic = topic;
    if (academicLevel) query.academicLevel = academicLevel;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    const samples = await sample_model_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await sample_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        samples,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching all samples for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching samples"
    });
  }
};
var getSampleStats = async (req, res) => {
  try {
    const stats = await sample_model_default.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    const subjectStats = await sample_model_default.aggregate([
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        popularSubjects: subjectStats
      }
    });
  } catch (error) {
    console.error("Error getting sample stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting sample stats"
    });
  }
};
var getSubjectCounts = async (req, res) => {
  try {
    const subjectStats = await sample_model_default.aggregate([
      {
        $match: { status: "Published" /* PUBLISHED */ }
        // Only count published samples
      },
      {
        $group: {
          _id: "$subject",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
      // Sort alphabetically by subject name
    ]);
    res.status(200).json({
      success: true,
      data: subjectStats
    });
  } catch (error) {
    console.error("Error getting subject counts:", error);
    res.status(500).json({
      success: false,
      message: "Error getting subject counts"
    });
  }
};
var validateSample = [
  expressValidator.body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 5e3 }).withMessage("Title must be between 3 and 5000 characters"),
  expressValidator.body("description").trim().notEmpty().withMessage("Description is required").isLength({ min: 10, max: 1e4 }).withMessage("Description must be between 10 and 10000 characters"),
  expressValidator.body("content").optional().isLength({ min: 10 }).withMessage("Content must be at least 10 characters"),
  expressValidator.body("subject").notEmpty().withMessage("Subject is required"),
  expressValidator.body("wordCount").optional().isInt({ min: 0 }).withMessage("Word count must be a non-negative integer"),
  expressValidator.body("referenceCount").optional().isInt({ min: 0 }).withMessage("Reference count must be a non-negative integer")
];
[
  expressValidator.body("question").trim().notEmpty().withMessage("Question is required").isLength({ min: 3, max: 500 }).withMessage("Question must be between 3 and 500 characters"),
  expressValidator.body("answer").trim().notEmpty().withMessage("Answer is required").isLength({ min: 10, max: 2e3 }).withMessage("Answer must be between 10 and 2000 characters"),
  expressValidator.body("order").optional().isInt({ min: 0 }).withMessage("Order must be a non-negative integer")
];

// src/routers/sample.routes.ts
var router = express.Router();
router.get("/", getSamples);
router.get("/:slug", getSampleBySlug);
router.get("/subjects/counts", getSubjectCounts);
router.post(
  "/",
  validateAdminAccess,
  upload.sample.single("content"),
  validateSample,
  createSample
);
router.put(
  "/:id",
  validateAdminAccess,
  upload.sample.single("content"),
  validateSample,
  updateSample
);
router.delete(
  "/:id",
  validateSuperAdminAccess,
  deleteSample
);
router.get(
  "/admin/stats",
  validateAdminAccess,
  getSampleStats
);
router.get(
  "/admin/all",
  validateAdminAccess,
  getAllSamplesForAdmin
);
router.get(
  "/admin/:id",
  validateAdminAccess,
  getSampleByIdForAdmin
);
router.patch(
  "/:id/toggle-status",
  validateAdminAccess,
  toggleSampleStatus
);
router.patch(
  "/:id/archive",
  validateAdminAccess,
  archiveSample
);
var sample_routes_default = router;

// src/controllers/dashboard.controller.ts
var getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const totalUsers = await user_model_default.countDocuments();
    const totalBlogs = await blog_model_default.countDocuments();
    const totalSamples = await sample_model_default.countDocuments();
    const totalServices = await Service.countDocuments();
    const recentUsers = await user_model_default.find().select("name email role createdAt verified").sort({ createdAt: -1 }).limit(5).lean();
    const recentBlogs = await blog_model_default.find().select("title slug status createdAt creator").populate("creator", "name").sort({ createdAt: -1 }).limit(5).lean();
    const recentSamples = await sample_model_default.find().select("title slug status createdAt").sort({ createdAt: -1 }).limit(5).lean();
    const userRoleDistribution = {
      admin: await user_model_default.countDocuments({ role: "Admin" /* ADMIN */ }),
      superAdmin: await user_model_default.countDocuments({ role: "Super_Admin" /* SUPER_ADMIN */ }),
      user: await user_model_default.countDocuments({ role: "User" /* USER */ })
    };
    const publishedBlogs = await blog_model_default.countDocuments({ status: "published" });
    const draftBlogs = await blog_model_default.countDocuments({ status: "draft" });
    const activeSamples = await sample_model_default.countDocuments({ status: "active" });
    const inactiveSamples = await sample_model_default.countDocuments({ status: "inactive" });
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyGrowth = {
      users: await user_model_default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      blogs: await blog_model_default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      samples: await sample_model_default.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    };
    const dashboardStats = {
      totalUsers,
      totalBlogs,
      totalSamples,
      totalServices,
      recentUsers,
      recentBlogs,
      recentSamples,
      userRoleDistribution,
      contentStatus: {
        publishedBlogs,
        draftBlogs,
        activeSamples,
        inactiveSamples
      },
      monthlyGrowth
    };
    res.status(200).json({
      success: true,
      data: dashboardStats,
      message: "Dashboard statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message
    });
  }
};
var getAdminDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "Admin" /* ADMIN */ && user.role !== "Super_Admin" /* SUPER_ADMIN */) {
      res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
      return;
    }
    await getDashboardStats(req, res);
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard statistics",
      error: error.message
    });
  }
};
var getSuperAdminDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "Super_Admin" /* SUPER_ADMIN */) {
      res.status(403).json({
        success: false,
        message: "Access denied. Super admin privileges required."
      });
      return;
    }
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const systemHealth = {
      totalStorageUsed: await getTotalStorageUsed(),
      averageResponseTime: await getAverageResponseTime(),
      errorRate: await getErrorRate(thirtyDaysAgo)
    };
    await getDashboardStats(req, res);
    const originalJson = res.json;
    res.json = function(data) {
      if (data.success) {
        data.data.systemHealth = systemHealth;
      }
      return originalJson.call(this, data);
    };
  } catch (error) {
    console.error("Error fetching super admin dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch super admin dashboard statistics",
      error: error.message
    });
  }
};
async function getTotalStorageUsed() {
  return 0;
}
async function getAverageResponseTime() {
  return 150;
}
async function getErrorRate(since) {
  return 0.02;
}

// src/routers/dashboard.routes.ts
var dashboardRouter = express.Router();
dashboardRouter.get("/", validateUserAccess, getDashboardStats);
dashboardRouter.get("/admin", validateAdminAccess, getAdminDashboardStats);
dashboardRouter.get("/super-admin", validateSuperAdminAccess, getSuperAdminDashboardStats);
var dashboard_routes_default = dashboardRouter;

// src/controllers/user.controller.ts
var getAllUsers = async (req, res) => {
  try {
    const {
      page = "1",
      limit = "10",
      search = "",
      role,
      verified,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    if (role && Object.values(EUserRole).includes(role)) {
      filter.role = role;
    }
    if (verified !== void 0) {
      filter.verified = verified === "true";
    }
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    const users = await user_model_default.find(filter).select("-password").sort(sort).skip(skip).limit(limitNum).lean();
    const totalUsers = await user_model_default.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limitNum);
    const roleStats = await user_model_default.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);
    const verificationStats = await user_model_default.aggregate([
      { $group: { _id: "$verified", count: { $sum: 1 } } }
    ]);
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalUsers,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
          limit: limitNum
        },
        stats: {
          roleDistribution: roleStats,
          verificationStats
        }
      },
      message: "Users retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};
var verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    if (typeof verified !== "boolean") {
      res.status(400).json({
        success: false,
        message: "Verified status must be a boolean"
      });
      return;
    }
    const user = await user_model_default.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    if (user.role === "Super_Admin" /* SUPER_ADMIN */ && !verified && req.user.id === id) {
      res.status(400).json({
        success: false,
        message: "Cannot unverify yourself as super admin"
      });
      return;
    }
    user.verified = verified;
    await user.save();
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role
        }
      },
      message: `User ${verified ? "verified" : "unverified"} successfully`
    });
  } catch (error) {
    console.error("Error updating user verification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user verification",
      error: error.message
    });
  }
};
var changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !Object.values(EUserRole).includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role provided",
        validRoles: Object.values(EUserRole)
      });
      return;
    }
    const user = await user_model_default.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    if (user.role === "Super_Admin" /* SUPER_ADMIN */ && role !== "Super_Admin" /* SUPER_ADMIN */) {
      const superAdminCount = await user_model_default.countDocuments({ role: "Super_Admin" /* SUPER_ADMIN */ });
      if (superAdminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot demote the last super admin"
        });
        return;
      }
    }
    if (req.user.id === id && req.user.role === "Super_Admin" /* SUPER_ADMIN */ && role !== "Super_Admin" /* SUPER_ADMIN */) {
      res.status(400).json({
        success: false,
        message: "Cannot demote yourself from super admin"
      });
      return;
    }
    const oldRole = user.role;
    user.role = role;
    await user.save();
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
          role: user.role
        },
        changes: {
          oldRole,
          newRole: user.role
        }
      },
      message: `User role changed from ${oldRole} to ${user.role} successfully`
    });
  } catch (error) {
    console.error("Error changing user role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change user role",
      error: error.message
    });
  }
};
var getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await user_model_default.findById(id).select("-password");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: { user },
      message: "User retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};

// src/routers/user.routes.ts
var userRouter = express.Router();
userRouter.use(validateSuperAdminAccess);
userRouter.get("/", getAllUsers);
userRouter.get("/:id", getUserById);
userRouter.put("/:id/verify", verifyUser);
userRouter.put("/:id/role", changeUserRole);
var user_routes_default = userRouter;
var TestimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  stars: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  location: {
    type: String,
    required: false,
    default: null
  },
  imageUrl: {
    type: String,
    required: false,
    default: null
  },
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "draft",
    required: true
  },
  forHomepage: {
    type: Boolean,
    default: false,
    required: true
  }
}, {
  timestamps: true
});
var testimonials_model_default = mongoose.model("Testimonial", TestimonialSchema);

// src/controllers/testimonials.controller.ts
var createTestimonial = async (req, res) => {
  try {
    const { name, content, stars, location, forHomepage, status } = req.body;
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "Stars field is required and must be between 1 and 5"
      });
    }
    const files = req.files;
    const imageFile = files?.image?.[0];
    const imageUrl = imageFile ? imageFile.path : void 0;
    const testimonial = new testimonials_model_default({
      name,
      content,
      stars: parseInt(stars),
      location,
      imageUrl,
      status: status || "draft",
      forHomepage: forHomepage || false
    });
    await testimonial.save();
    res.status(201).json({
      success: true,
      message: "Testimonial created successfully",
      data: testimonial
    });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error creating testimonial",
      error: process.env.NODE_ENV === "development" ? error : void 0
    });
  }
};
var getTestimonials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const forHomepage = req.query.forHomepage;
    const query = { status: "published" };
    if (forHomepage !== void 0) {
      query.forHomepage = forHomepage === "true";
    }
    const testimonials = await testimonials_model_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await testimonials_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials"
    });
  }
};
var getAllTestimonialsForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const forHomepage = req.query.forHomepage;
    const status = req.query.status;
    const query = {};
    if (forHomepage !== void 0) {
      query.forHomepage = forHomepage === "true";
    }
    if (status) {
      query.status = status;
    }
    const testimonials = await testimonials_model_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await testimonials_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        testimonials,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching testimonials for admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonials for admin"
    });
  }
};
var getTestimonialById = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await testimonials_model_default.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    res.status(200).json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching testimonial"
    });
  }
};
var updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, stars, location, forHomepage, status } = req.body;
    const testimonial = await testimonials_model_default.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    if (stars !== void 0 && (stars < 1 || stars > 5)) {
      return res.status(400).json({
        success: false,
        message: "Stars must be between 1 and 5"
      });
    }
    const files = req.files;
    const imageFile = files?.image?.[0];
    if (imageFile) {
      if (testimonial.imageUrl) {
        const publicId = getPublicIdFromUrl(testimonial.imageUrl);
        if (publicId) {
          await cloudinaryUtils.deleteFile(publicId);
        }
      }
      testimonial.imageUrl = imageFile.path;
    }
    testimonial.name = name || testimonial.name;
    testimonial.content = content || testimonial.content;
    testimonial.stars = stars !== void 0 ? parseInt(stars) : testimonial.stars;
    testimonial.location = location !== void 0 ? location : testimonial.location;
    testimonial.forHomepage = forHomepage !== void 0 ? forHomepage : testimonial.forHomepage;
    testimonial.status = status || testimonial.status;
    await testimonial.save();
    res.status(200).json({
      success: true,
      message: "Testimonial updated successfully",
      data: testimonial
    });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error updating testimonial"
    });
  }
};
var deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await testimonials_model_default.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    if (testimonial.imageUrl) {
      const publicId = getPublicIdFromUrl(testimonial.imageUrl);
      if (publicId) {
        await cloudinaryUtils.deleteFile(publicId);
      }
    }
    await testimonials_model_default.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Testimonial deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting testimonial"
    });
  }
};
var getHomepageTestimonials = async (req, res) => {
  try {
    const testimonials = await testimonials_model_default.find({
      forHomepage: true,
      status: "published"
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    console.error("Error fetching homepage testimonials:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching homepage testimonials"
    });
  }
};
var changeTestimonialStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'draft', 'published', or 'archived'"
      });
    }
    const testimonial = await testimonials_model_default.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    testimonial.status = status;
    await testimonial.save();
    res.status(200).json({
      success: true,
      message: `Testimonial status changed to ${status}`,
      data: testimonial
    });
  } catch (error) {
    console.error("Error changing testimonial status:", error);
    res.status(500).json({
      success: false,
      message: "Error changing testimonial status"
    });
  }
};
var toggleTestimonialForHomepage = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await testimonials_model_default.findById(id);
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: "Testimonial not found"
      });
    }
    testimonial.forHomepage = !testimonial.forHomepage;
    await testimonial.save();
    res.status(200).json({
      success: true,
      message: `Testimonial ${testimonial.forHomepage ? "added to" : "removed from"} homepage`,
      data: testimonial
    });
  } catch (error) {
    console.error("Error toggling testimonial for homepage:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling testimonial for homepage"
    });
  }
};

// src/routers/testimonial.routes.ts
var testimonialRouter = express.Router();
testimonialRouter.get("/", getTestimonials);
testimonialRouter.get("/homepage", getHomepageTestimonials);
testimonialRouter.get("/:id", validateAdminAccess, getTestimonialById);
testimonialRouter.get("/admin/all", validateAdminAccess, getAllTestimonialsForAdmin);
testimonialRouter.post(
  "/",
  validateAdminAccess,
  upload.testimonial.fields([
    { name: "image", maxCount: 1 }
  ]),
  createTestimonial
);
testimonialRouter.put(
  "/:id",
  validateAdminAccess,
  upload.testimonial.fields([
    { name: "image", maxCount: 1 }
  ]),
  updateTestimonial
);
testimonialRouter.patch("/:id/status", validateAdminAccess, changeTestimonialStatus);
testimonialRouter.patch("/:id/toggle-homepage", validateAdminAccess, toggleTestimonialForHomepage);
testimonialRouter.delete("/:id", validateSuperAdminAccess, deleteTestimonial);
var testimonial_routes_default = testimonialRouter;
var ImageAssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  altText: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});
var imageAssets_model_default = mongoose.model("ImageAsset", ImageAssetSchema);

// src/controllers/imageAssets.controller.ts
var createImageAsset = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    const { name, altText } = req.body;
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Image file is required"
      });
    }
    const imageAsset = new imageAssets_model_default({
      name,
      url: imageFile.path,
      // Cloudinary URL
      altText,
      publicId: imageFile.filename
      // Store the public ID from Cloudinary
    });
    await imageAsset.save();
    res.status(201).json({
      success: true,
      message: "Image asset created successfully",
      data: imageAsset
    });
  } catch (error) {
    console.error("Error creating image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error creating image asset",
      error: process.env.NODE_ENV === "development" ? error : void 0
    });
  }
};
var getImageAssets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { altText: { $regex: search, $options: "i" } }
      ];
    }
    const imageAssets = await imageAssets_model_default.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await imageAssets_model_default.countDocuments(query);
    res.status(200).json({
      success: true,
      data: {
        imageAssets,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching image assets:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image assets"
    });
  }
};
var getImageAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const imageAsset = await imageAssets_model_default.findById(id);
    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found"
      });
    }
    res.status(200).json({
      success: true,
      data: imageAsset
    });
  } catch (error) {
    console.error("Error fetching image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image asset"
    });
  }
};
var updateImageAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, altText } = req.body;
    const imageAsset = await imageAssets_model_default.findById(id);
    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found"
      });
    }
    const imageFile = req.file;
    if (imageFile) {
      if (imageAsset.publicId) {
        try {
          await cloudinaryUtils.deleteImageAsset(imageAsset.publicId);
        } catch (error) {
          console.warn("Failed to delete old image from Cloudinary:", error);
        }
      }
      imageAsset.url = imageFile.path;
      imageAsset.publicId = imageFile.filename;
    }
    imageAsset.name = name || imageAsset.name;
    imageAsset.altText = altText || imageAsset.altText;
    await imageAsset.save();
    res.status(200).json({
      success: true,
      message: "Image asset updated successfully",
      data: imageAsset
    });
  } catch (error) {
    console.error("Error updating image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error updating image asset"
    });
  }
};
var deleteImageAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const imageAsset = await imageAssets_model_default.findById(id);
    if (!imageAsset) {
      return res.status(404).json({
        success: false,
        message: "Image asset not found"
      });
    }
    if (imageAsset.publicId) {
      try {
        await cloudinaryUtils.deleteImageAsset(imageAsset.publicId);
      } catch (error) {
        console.warn("Failed to delete image from Cloudinary:", error);
      }
    }
    await imageAssets_model_default.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Image asset deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting image asset:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting image asset"
    });
  }
};
var getImageAssetStats = async (req, res) => {
  try {
    const totalAssets = await imageAssets_model_default.countDocuments();
    const recentAssets = await imageAssets_model_default.find().sort({ createdAt: -1 }).limit(10).select("name url createdAt");
    res.status(200).json({
      success: true,
      data: {
        totalAssets,
        recentAssets
      }
    });
  } catch (error) {
    console.error("Error fetching image asset stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching image asset stats"
    });
  }
};
var bulkDeleteImageAssets = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of image asset IDs"
      });
    }
    const imageAssets = await imageAssets_model_default.find({ _id: { $in: ids } });
    const publicIds = [];
    imageAssets.forEach((asset) => {
      if (asset.publicId) {
        publicIds.push(asset.publicId);
      }
    });
    if (publicIds.length > 0) {
      try {
        await cloudinaryUtils.deleteImageAssets(publicIds);
      } catch (error) {
        console.warn("Failed to delete some images from Cloudinary:", error);
      }
    }
    const result = await imageAssets_model_default.deleteMany({ _id: { $in: ids } });
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} image assets deleted successfully`,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error("Error bulk deleting image assets:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk deleting image assets"
    });
  }
};
var validateImageAsset = [
  expressValidator.body("name").notEmpty().withMessage("Image name is required").isLength({ min: 1, max: 100 }).withMessage("Image name must be between 1 and 100 characters"),
  expressValidator.body("altText").notEmpty().withMessage("Alt text is required").isLength({ min: 1, max: 200 }).withMessage("Alt text must be between 1 and 200 characters")
];

// src/routers/imageAssets.routes.ts
var imageAssetsRouter = express.Router();
imageAssetsRouter.use(validateAdminAccess);
imageAssetsRouter.get("/", getImageAssets);
imageAssetsRouter.get("/:id", getImageAssetById);
imageAssetsRouter.post(
  "/create",
  validateAdminAccess,
  upload.imageAssets.single("image"),
  validateImageAsset,
  createImageAsset
);
imageAssetsRouter.put(
  "/:id",
  validateAdminAccess,
  upload.imageAssets.single("image"),
  validateImageAsset,
  updateImageAsset
);
imageAssetsRouter.delete(
  "/:id",
  validateAdminAccess,
  deleteImageAsset
);
imageAssetsRouter.get("/admin/stats", validateAdminAccess, getImageAssetStats);
imageAssetsRouter.post("/admin/bulk-delete", validateAdminAccess, bulkDeleteImageAssets);
var imageAssets_routes_default = imageAssetsRouter;
var ECaseStudyStatus = /* @__PURE__ */ ((ECaseStudyStatus2) => {
  ECaseStudyStatus2["DRAFT"] = "Draft";
  ECaseStudyStatus2["PUBLISHED"] = "Published";
  ECaseStudyStatus2["ARCHIVED"] = "Archived";
  return ECaseStudyStatus2;
})(ECaseStudyStatus || {});
var CaseStudySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    subtitle: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    youtubeUrl: {
      type: String,
      optional: true
    },
    overview: {
      content: {
        type: String,
        required: true
      },
      features: [
        {
          icon: {
            type: String,
            required: true
          },
          title: {
            type: String,
            required: true
          }
        }
      ]
    },
    highlight: {
      content: [
        {
          type: String,
          required: true
        }
      ]
    },
    challenge: {
      subtitle: {
        type: String,
        required: true
      },
      content: [
        {
          type: String,
          required: true
        }
      ]
    },
    solution: {
      subtitle: {
        type: String,
        required: true
      },
      content: [
        {
          type: String,
          required: true
        }
      ]
    },
    quote: {
      text: {
        type: String,
        required: true
      },
      by: {
        type: String,
        required: true
      },
      position: {
        type: String,
        required: true
      }
    },
    results: {
      subtitle: {
        type: String,
        required: true
      },
      content: [
        {
          type: String,
          required: true
        }
      ]
    },
    status: {
      type: String,
      enum: Object.values(ECaseStudyStatus),
      default: "Draft" /* DRAFT */
    }
  },
  {
    timestamps: true
  }
);
var CaseStudy = mongoose.model("CaseStudy", CaseStudySchema);

// src/controllers/caseStudy.controller.ts
var createCaseStudy = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const {
      title,
      subtitle,
      imageUrl,
      youtubeUrl,
      overview,
      highlight,
      challenge,
      solution,
      quote,
      results
    } = req.body;
    const files = req.files;
    let finalImageUrl = imageUrl;
    if (files.image && files.image[0]) {
      finalImageUrl = files.image[0].path;
    }
    const slug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
    const existingCaseStudy = await CaseStudy.findOne({ slug });
    if (existingCaseStudy) {
      return res.status(400).json({
        success: false,
        message: "A case study with this title already exists"
      });
    }
    const caseStudy = new CaseStudy({
      title,
      slug,
      subtitle,
      imageUrl: finalImageUrl,
      youtubeUrl,
      overview: JSON.parse(overview || "{}"),
      highlight: JSON.parse(highlight || "{}"),
      challenge: JSON.parse(challenge || "{}"),
      solution: JSON.parse(solution || "{}"),
      quote: JSON.parse(quote || "{}"),
      results: JSON.parse(results || "{}"),
      status: "Draft" /* DRAFT */
    });
    await caseStudy.save();
    res.status(201).json({
      success: true,
      message: "Case study created successfully",
      data: caseStudy
    });
  } catch (error) {
    console.error("Error creating case study:", error);
    res.status(500).json({
      success: false,
      message: "Error creating case study"
    });
  }
};
var getCaseStudies = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit;
    const limit = limitParam ? parseInt(limitParam) : void 0;
    const query = {};
    if (status) {
      query.status = status;
    } else {
      query.status = "Published" /* PUBLISHED */;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } }
      ];
    }
    let queryBuilder = CaseStudy.find(query);
    if (limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
    }
    const caseStudies = await queryBuilder.exec();
    const total = await CaseStudy.countDocuments(query);
    res.json({
      success: true,
      data: caseStudies,
      pagination: limit ? {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      } : void 0
    });
  } catch (error) {
    console.error("Error getting case studies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case studies"
    });
  }
};
var getCaseStudyBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const caseStudy = await CaseStudy.findOne({
      slug,
      status: "Published" /* PUBLISHED */
    });
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found"
      });
    }
    res.json({
      success: true,
      data: caseStudy
    });
  } catch (error) {
    console.error("Error getting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case study"
    });
  }
};
var getCaseStudyByIdForAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const caseStudy = await CaseStudy.findById(id);
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found"
      });
    }
    res.json({
      success: true,
      data: caseStudy
    });
  } catch (error) {
    console.error("Error getting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case study"
    });
  }
};
var getAllCaseStudiesForAdmin = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limitParam = req.query.limit;
    const limit = limitParam ? parseInt(limitParam) : 10;
    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { subtitle: { $regex: search, $options: "i" } }
      ];
    }
    const skip = (page - 1) * limit;
    const caseStudies = await CaseStudy.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });
    const total = await CaseStudy.countDocuments(query);
    res.json({
      success: true,
      data: caseStudies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting case studies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching case studies"
    });
  }
};
var updateCaseStudy = async (req, res) => {
  try {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    const { id } = req.params;
    const {
      title,
      subtitle,
      imageUrl,
      youtubeUrl,
      overview,
      highlight,
      challenge,
      solution,
      quote,
      results,
      status
    } = req.body;
    const caseStudy = await CaseStudy.findById(id);
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found"
      });
    }
    const files = req.files;
    let finalImageUrl = imageUrl || caseStudy.imageUrl;
    if (files.image && files.image[0]) {
      finalImageUrl = files.image[0].path;
    }
    let newSlug = caseStudy.slug;
    if (title && title !== caseStudy.title) {
      newSlug = title.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");
      const existingCaseStudy = await CaseStudy.findOne({
        slug: newSlug,
        _id: { $ne: id }
      });
      if (existingCaseStudy) {
        return res.status(400).json({
          success: false,
          message: "A case study with this title already exists"
        });
      }
    }
    caseStudy.title = title || caseStudy.title;
    caseStudy.slug = newSlug;
    caseStudy.subtitle = subtitle || caseStudy.subtitle;
    caseStudy.imageUrl = finalImageUrl;
    caseStudy.youtubeUrl = youtubeUrl !== void 0 ? youtubeUrl : caseStudy.youtubeUrl;
    if (overview) caseStudy.overview = JSON.parse(overview);
    if (highlight) caseStudy.highlight = JSON.parse(highlight);
    if (challenge) caseStudy.challenge = JSON.parse(challenge);
    if (solution) caseStudy.solution = JSON.parse(solution);
    if (quote) caseStudy.quote = JSON.parse(quote);
    if (results) caseStudy.results = JSON.parse(results);
    if (status && Object.values(ECaseStudyStatus).includes(status)) {
      caseStudy.status = status;
    }
    await caseStudy.save();
    res.json({
      success: true,
      message: "Case study updated successfully",
      data: caseStudy
    });
  } catch (error) {
    console.error("Error updating case study:", error);
    res.status(500).json({
      success: false,
      message: "Error updating case study"
    });
  }
};
var toggleCaseStudyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !Object.values(ECaseStudyStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status"
      });
    }
    const caseStudy = await CaseStudy.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found"
      });
    }
    res.json({
      success: true,
      message: "Case study status updated successfully",
      data: caseStudy
    });
  } catch (error) {
    console.error("Error toggling case study status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating case study status"
    });
  }
};
var getCaseStudyStats = async (req, res) => {
  try {
    const total = await CaseStudy.countDocuments();
    const published = await CaseStudy.countDocuments({
      status: "Published" /* PUBLISHED */
    });
    const draft = await CaseStudy.countDocuments({
      status: "Draft" /* DRAFT */
    });
    const archived = await CaseStudy.countDocuments({
      status: "Archived" /* ARCHIVED */
    });
    res.json({
      success: true,
      data: {
        total,
        published,
        draft,
        archived
      }
    });
  } catch (error) {
    console.error("Error getting case study stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics"
    });
  }
};
var deleteCaseStudy = async (req, res) => {
  try {
    const { id } = req.params;
    const caseStudy = await CaseStudy.findByIdAndDelete(id);
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: "Case study not found"
      });
    }
    res.json({
      success: true,
      message: "Case study deleted successfully",
      data: caseStudy
    });
  } catch (error) {
    console.error("Error deleting case study:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting case study"
    });
  }
};
var validateCaseStudy = [
  expressValidator.body("title").trim().notEmpty().withMessage("Title is required").isLength({ min: 3, max: 200 }).withMessage("Title must be between 3 and 200 characters"),
  expressValidator.body("subtitle").trim().notEmpty().withMessage("Subtitle is required").isLength({ min: 3, max: 300 }).withMessage("Subtitle must be between 3 and 300 characters"),
  expressValidator.body("overview").notEmpty().withMessage("Overview is required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!parsed.content || typeof parsed.content !== "string") {
      throw new Error("Overview content is required");
    }
    if (!Array.isArray(parsed.features)) {
      throw new Error("Overview features must be an array");
    }
    parsed.features.forEach((feature, index) => {
      if (!feature.icon || !feature.title) {
        throw new Error(
          `Feature at index ${index} must have icon and title`
        );
      }
    });
    return true;
  }),
  expressValidator.body("highlight").notEmpty().withMessage("Highlight is required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed.content) || parsed.content.length === 0) {
      throw new Error("Highlight content must be a non-empty array");
    }
    return true;
  }),
  expressValidator.body("challenge").notEmpty().withMessage("Challenge is required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!parsed.subtitle || !Array.isArray(parsed.content)) {
      throw new Error("Challenge must have subtitle and content array");
    }
    if (parsed.content.length === 0) {
      throw new Error("Challenge content cannot be empty");
    }
    return true;
  }),
  expressValidator.body("solution").notEmpty().withMessage("Solution is required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!parsed.subtitle || !Array.isArray(parsed.content)) {
      throw new Error("Solution must have subtitle and content array");
    }
    if (parsed.content.length === 0) {
      throw new Error("Solution content cannot be empty");
    }
    return true;
  }),
  expressValidator.body("quote").notEmpty().withMessage("Quote is required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!parsed.text || !parsed.by || !parsed.position) {
      throw new Error("Quote must have text, by, and position fields");
    }
    return true;
  }),
  expressValidator.body("results").notEmpty().withMessage("Results are required").custom((value) => {
    const parsed = JSON.parse(value);
    if (!parsed.subtitle || !Array.isArray(parsed.content)) {
      throw new Error("Results must have subtitle and content array");
    }
    if (parsed.content.length === 0) {
      throw new Error("Results content cannot be empty");
    }
    return true;
  }),
  expressValidator.body("youtubeUrl").optional().isURL().withMessage("YouTube URL must be a valid URL")
];

// src/routers/caseStudy.routes.ts
var caseStudyRouter = express.Router();
caseStudyRouter.get("/", getCaseStudies);
caseStudyRouter.get("/slug/:slug", getCaseStudyBySlug);
caseStudyRouter.post(
  "/",
  validateAdminAccess,
  upload.caseStudy.fields([
    { name: "image", maxCount: 1 }
  ]),
  validateCaseStudy,
  createCaseStudy
);
caseStudyRouter.get("/admin/all", validateAdminAccess, getAllCaseStudiesForAdmin);
caseStudyRouter.get("/admin/:id", validateAdminAccess, getCaseStudyByIdForAdmin);
caseStudyRouter.get("/admin/stats", validateAdminAccess, getCaseStudyStats);
caseStudyRouter.put(
  "/:id",
  validateAdminAccess,
  upload.caseStudy.fields([
    { name: "image", maxCount: 1 }
  ]),
  validateCaseStudy,
  updateCaseStudy
);
caseStudyRouter.patch(
  "/:id/toggle-status",
  validateAdminAccess,
  toggleCaseStudyStatus
);
caseStudyRouter.delete(
  "/:id",
  validateSuperAdminAccess,
  deleteCaseStudy
);
var caseStudy_routes_default = caseStudyRouter;

// src/api.router.ts
var apiRouter = express.Router();
apiRouter.use("/auth", auth_routes_default);
apiRouter.use("/order", order_routes_default);
apiRouter.use("/blogs", blog_routes_default);
apiRouter.use("/services", service_routes_default);
apiRouter.use("/samples", sample_routes_default);
apiRouter.use("/dashboard", dashboard_routes_default);
apiRouter.use("/users", user_routes_default);
apiRouter.use("/testimonials", testimonial_routes_default);
apiRouter.use("/image-assets", imageAssets_routes_default);
apiRouter.use("/case-studies", caseStudy_routes_default);
var api_router_default = apiRouter;

// src/middleware/errorHandler.middleware.ts
var errorHandler = (err, req, res) => {
  console.error("Global error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
    // Hide details in production
  });
};

// src/app.ts
var app = express__default.default();
app.use(express__default.default.json());
app.use(cookieParser__default.default());
app.use(
  cors__default.default({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    // Allow requests only from configured client
    credentials: true,
    // Enable cookies and authorization headers
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400
    // CORS preflight cache time (24 hour)
  })
);
app.use("/api", api_router_default);
app.get("/health", (req, res) => {
  res.send("Rapidsio API is running...");
});
var dbString = process.env.MONGODB_URI;
var nodeEnv = process.env.NODE_ENV + " Environment" || "Environment not found";
app.get("/dbString", (req, res) => {
  res.status(200).json({ message: `${nodeEnv} with MongoURL ${dbString}` });
});
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});
app.use(errorHandler);
var app_default = app;
var connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/ping-assignment";
    await mongoose__default.default.connect(mongoUri);
    console.log("\u{1F4E6} Connected to MongoDB database");
  } catch (error) {
    console.error("\u274C MongoDB connection error:", error);
    process.exit(1);
  }
};
var disconnectFromDatabase = async () => {
  try {
    await mongoose__default.default.disconnect();
    console.log("\u{1F4E6} Disconnected from MongoDB database");
  } catch (error) {
    console.error("\u274C MongoDB disconnection error:", error);
    process.exit(1);
  }
};

// src/index.ts
dotenv__default.default.config();
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary environment variables");
  process.exit(1);
}
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log("Cloudinary configured successfully");
var port = process.env.PORT || 8080;
app_default.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
connectToDatabase().then(() => {
  console.log("MongoDB connected successfully");
}).catch((err) => {
  console.error("MongoDB connection error:", err.message);
  console.log("Server running without database connection");
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection at:", promise, "reason:", reason);
});
process.on("SIGINT", async () => {
  console.log("Shutting down the app");
  disconnectFromDatabase();
  process.exit(0);
});
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map