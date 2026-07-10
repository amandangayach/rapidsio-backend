import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Cloudinary will be configured in index.ts after dotenv is loaded

// Base storage configuration factory
const createStorageConfig = (folderPath: string, allowedFormats: string[], resourceType: string = 'auto') => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `convert-spaces/${folderPath}`,
      allowed_formats: allowedFormats,
      resource_type: resourceType,
      public_id: (req: any, file: any) => {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomString}-${file.originalname.replace(/\s+/g, '-')}`;
      },
      access_mode: 'public',
      transformation: [{ quality: 'auto:good' }], // Automatic quality optimization
    } as any,
  });
};

// Client documents storage configuration
const clientStorage = createStorageConfig(
  'client-documents',
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt']
);

// Blog content storage configuration
const blogStorage = createStorageConfig(
  'content/blogs',
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'html', 'md'],
  'raw'
);

// Sample content storage configuration
const sampleStorage = createStorageConfig(
  'content/samples',
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'html', 'md'],
  'raw'
);

// Service content storage configuration
const serviceStorage = createStorageConfig(
  'content/services',
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'html', 'md', 'json'],
  'raw'
);

// Testimonial image storage configuration
const testimonialStorage = createStorageConfig(
  'images/testimonials',
  ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'image'
);

// Image assets storage configuration
const imageAssetsStorage = createStorageConfig(
  'images/assets',
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  'image'
);

// Case study storage configuration
const caseStudyStorage = createStorageConfig(
  'images/case-studies',
  ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'image'
);

// Create middleware factory
const createUploadMiddleware = (storage: CloudinaryStorage, allowedFormats: string[]) => {
  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, callback) => {
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      if (!extension || !allowedFormats.includes(extension)) {
        console.log(`Rejected file: ${file.originalname}, extension: ${extension}, allowed: ${allowedFormats.join(', ')}`);
        return callback(new Error(`Invalid file type. Allowed types: ${allowedFormats.join(', ')}`));
      }
      callback(null, true);
    }
  });
};

// Create middleware instances
const clientUploadMiddleware = createUploadMiddleware(clientStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt']);
const blogUploadMiddleware = createUploadMiddleware(blogStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'html', 'md']);
const sampleUploadMiddleware = createUploadMiddleware(sampleStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'html', 'md']);
const serviceUploadMiddleware = createUploadMiddleware(serviceStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'html', 'md', 'json']);
const testimonialUploadMiddleware = createUploadMiddleware(testimonialStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
const imageAssetsUploadMiddleware = createUploadMiddleware(imageAssetsStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
const caseStudyUploadMiddleware = createUploadMiddleware(caseStudyStorage, ['jpg', 'jpeg', 'png', 'gif', 'webp']);

// Generic error handler for upload middleware
const handleUploadError = (err: any, res: any) => {
  console.error('Upload error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      error: 'FILE_TOO_LARGE'
    });
  }
  return res.status(400).json({
    success: false,
    message: err.message,
    error: 'UPLOAD_ERROR'
  });
};

// Create middleware wrapper for optional uploads
const createOptionalUploadMiddleware = (middleware: any) => {
  return (fieldName: string) => (req: any, res: any, next: any) => {
    if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
      return next();
    }
    middleware.single(fieldName)(req, res, (err: any) => {
      if (err) return handleUploadError(err, res);
      next();
    });
  };
};

// Export unified upload interface
export const upload = {
  client: {
    single: (fieldName: string) => clientUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 10) => {
      return (req: any, res: any, next: any) => {
        clientUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => clientUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(clientUploadMiddleware),
  },
  blog: {
    single: (fieldName: string) => blogUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        blogUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => blogUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(blogUploadMiddleware),
  },
  sample: {
    single: (fieldName: string) => sampleUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        sampleUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    optional: createOptionalUploadMiddleware(sampleUploadMiddleware),
  },
  service: {
    single: (fieldName: string) => serviceUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        serviceUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => serviceUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(serviceUploadMiddleware),
  },
  testimonial: {
    single: (fieldName: string) => testimonialUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        testimonialUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => testimonialUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(testimonialUploadMiddleware),
  },
  imageAssets: {
    single: (fieldName: string) => imageAssetsUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 10) => {
      return (req: any, res: any, next: any) => {
        imageAssetsUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => imageAssetsUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(imageAssetsUploadMiddleware),
  },
  caseStudy: {
    single: (fieldName: string) => caseStudyUploadMiddleware.single(fieldName),
    array: (fieldName: string, maxCount: number = 5) => {
      return (req: any, res: any, next: any) => {
        caseStudyUploadMiddleware.array(fieldName, maxCount)(req, res, (err: any) => {
          if (err) return handleUploadError(err, res);
          next();
        });
      };
    },
    fields: (fields: { name: string, maxCount: number }[]) => caseStudyUploadMiddleware.fields(fields),
    optional: createOptionalUploadMiddleware(caseStudyUploadMiddleware),
  },
};

// Cloudinary utility functions
export const cloudinaryUtils = {
  // Delete a file from Cloudinary
  deleteFile: async (publicId: string, resourceType: string = 'image') => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw error;
    }
  },

  // Delete multiple files from Cloudinary
  deleteFiles: async (publicIds: string[], resourceType: string = 'image') => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error('Error deleting files from Cloudinary:', error);
      throw error;
    }
  },

  // Delete image asset by public ID (specific for image assets)
  deleteImageAsset: async (publicId: string) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'image',
        invalidate: true // Invalidate CDN cache
      });
      return result;
    } catch (error) {
      console.error('Error deleting image asset from Cloudinary:', error);
      throw error;
    }
  },

  // Delete multiple image assets by public IDs (specific for image assets)
  deleteImageAssets: async (publicIds: string[]) => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds, { 
        resource_type: 'image',
        invalidate: true // Invalidate CDN cache
      });
      return result;
    } catch (error) {
      console.error('Error bulk deleting image assets from Cloudinary:', error);
      throw error;
    }
  },

  // Extract public ID from Cloudinary URL
  getPublicIdFromUrl: (url: string) => {
    try {
      // Updated regex to capture the full public ID including either convert-spaces, str-dra, or ping-assignments folder and extension for raw files
      const regex = /(convert-spaces|str-dra|ping-assignments)\/[^?]+/;
      const match = url.match(regex);
      return match ? match[0] : '';
    } catch (error) {
      console.error('Error extracting public ID from URL:', error);
      return '';
    }
  },

  // Generate a Cloudinary URL with transformations
  generateUrl: (publicId: string, options: any = {}) => {
    try {
      return cloudinary.url(publicId, options);
    } catch (error) {
      console.error('Error generating Cloudinary URL:', error);
      return '';
    }
  },

  // Get details about a file
  getFileDetails: async (publicId: string, resourceType: string = 'image') => {
    try {
      const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });
      return result;
    } catch (error) {
      console.error('Error getting file details from Cloudinary:', error);
      throw error;
    }
  },

  // Create a zip archive of multiple files
  createArchive: async (publicIds: string[], options: any = {}) => {
    try {
      const result = await cloudinary.utils.download_zip_url({
        public_ids: publicIds,
        ...options,
      });
      return result;
    } catch (error) {
      console.error('Error creating archive from Cloudinary:', error);
      throw error;
    }
  },

  // Get resource usage statistics
  getUsageStats: async () => {
    try {
      const result = await cloudinary.api.usage();
      return result;
    } catch (error) {
      console.error('Error getting Cloudinary usage stats:', error);
      throw error;
    }
  },
};

// For backward compatibility
export const deleteImage = cloudinaryUtils.deleteFile;
export const getPublicIdFromUrl = cloudinaryUtils.getPublicIdFromUrl;