import exifr from "exifr";
import path from "path";

/**
 * Extract EXIF metadata from uploaded images
 * @param filePath - Path to the image file
 * @returns Promise<object> - Extracted metadata object
 */
export async function extractImageMetadata(filePath: string): Promise<object> {
  try {
    // Extract comprehensive EXIF data
    const metadata = await exifr.parse(filePath, {
      // Include common EXIF tags
      exif: true,
      gps: true,
      ifd0: true,
      ifd1: true,

      // Additional metadata
      iptc: true,
      xmp: true,
      icc: true,

      // Custom options
      pick: [
        // Camera information
        "Make",
        "Model",
        "Software",

        // Image technical details
        "ImageWidth",
        "ImageHeight",
        "Orientation",
        "ColorSpace",
        "ResolutionX",
        "ResolutionY",
        "BitsPerSample",
        "Compression",

        // Camera settings
        "ISO",
        "ExposureTime",
        "FNumber",
        "FocalLength",
        "Flash",
        "WhiteBalance",
        "MeteringMode",
        "ExposureMode",
        "SceneCaptureType",

        // Date/time
        "DateTime",
        "DateTimeOriginal",
        "DateTimeDigitized",
        "CreateDate",
        "ModifyDate",

        // GPS data (if available)
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
        "GPSDateStamp",
        "GPSTimeStamp",

        // Copyright and artist info
        "Artist",
        "Copyright",
        "CreatorTool",

        // Custom fields
        "UserComment",
        "ImageDescription",
      ],
    });

    // Clean and structure the metadata
    const cleanMetadata: any = {
      format: path.extname(filePath).toLowerCase().slice(1),
      extracted_at: new Date().toISOString(),
    };

    if (metadata) {
      // Camera information
      if (metadata.Make || metadata.Model) {
        cleanMetadata.camera = {
          make: metadata.Make || null,
          model: metadata.Model || null,
          software: metadata.Software || null,
        };
      }

      // Image dimensions and technical details
      cleanMetadata.image = {
        width: metadata.ImageWidth || metadata.ExifImageWidth || null,
        height: metadata.ImageHeight || metadata.ExifImageHeight || null,
        orientation: metadata.Orientation || null,
        resolution: {
          x: metadata.XResolution || metadata.ResolutionX || null,
          y: metadata.YResolution || metadata.ResolutionY || null,
          unit: metadata.ResolutionUnit || null,
        },
        colorSpace: metadata.ColorSpace || null,
        bitsPerSample: metadata.BitsPerSample || null,
        compression: metadata.Compression || null,
      };

      // Camera settings
      if (metadata.ISO || metadata.ExposureTime || metadata.FNumber) {
        cleanMetadata.settings = {
          iso: metadata.ISO || null,
          exposureTime: metadata.ExposureTime || null,
          fNumber: metadata.FNumber || null,
          focalLength: metadata.FocalLength || null,
          flash: metadata.Flash || null,
          whiteBalance: metadata.WhiteBalance || null,
          meteringMode: metadata.MeteringMode || null,
          exposureMode: metadata.ExposureMode || null,
          sceneType: metadata.SceneCaptureType || null,
        };
      }

      // Timestamps
      cleanMetadata.dates = {
        created: metadata.DateTimeOriginal || metadata.CreateDate || null,
        modified: metadata.DateTime || metadata.ModifyDate || null,
        digitized: metadata.DateTimeDigitized || null,
      };

      // GPS location (if available)
      if (metadata.GPSLatitude && metadata.GPSLongitude) {
        cleanMetadata.location = {
          latitude: metadata.GPSLatitude,
          longitude: metadata.GPSLongitude,
          altitude: metadata.GPSAltitude || null,
          timestamp:
            metadata.GPSDateStamp && metadata.GPSTimeStamp
              ? `${metadata.GPSDateStamp} ${metadata.GPSTimeStamp}`
              : null,
        };
      }

      // Copyright and creator info
      if (metadata.Artist || metadata.Copyright || metadata.CreatorTool) {
        cleanMetadata.creator = {
          artist: metadata.Artist || null,
          copyright: metadata.Copyright || null,
          tool: metadata.CreatorTool || metadata.Software || null,
        };
      }

      // Additional metadata
      if (metadata.UserComment || metadata.ImageDescription) {
        cleanMetadata.description = {
          comment: metadata.UserComment || null,
          description: metadata.ImageDescription || null,
        };
      }
    }

    return cleanMetadata;
  } catch (error) {
    console.warn(
      `[METADATA] Could not extract EXIF data from ${filePath}:`,
      error.message,
    );

    // Return basic metadata even if EXIF extraction fails
    return {
      format: path.extname(filePath).toLowerCase().slice(1),
      extracted_at: new Date().toISOString(),
      error: "EXIF extraction failed",
      reason: error.message,
    };
  }
}

/**
 * Extract metadata from video files (basic info)
 * @param filePath - Path to the video file
 * @returns Promise<object> - Basic video metadata
 */
export async function extractVideoMetadata(filePath: string): Promise<object> {
  try {
    // For now, return basic file information
    // In future, could integrate with ffprobe or similar tool
    return {
      format: path.extname(filePath).toLowerCase().slice(1),
      type: "video",
      extracted_at: new Date().toISOString(),
      note: "Video metadata extraction not yet implemented",
    };
  } catch (error) {
    return {
      format: path.extname(filePath).toLowerCase().slice(1),
      type: "video",
      extracted_at: new Date().toISOString(),
      error: "Video metadata extraction failed",
      reason: error.message,
    };
  }
}

/**
 * Extract metadata based on file type
 * @param filePath - Path to the media file
 * @param mimeType - MIME type of the file
 * @returns Promise<object> - Extracted metadata
 */
export async function extractMetadata(
  filePath: string,
  mimeType: string,
): Promise<object> {
  if (mimeType.startsWith("image/")) {
    return await extractImageMetadata(filePath);
  } else if (mimeType.startsWith("video/")) {
    return await extractVideoMetadata(filePath);
  } else {
    return {
      format: path.extname(filePath).toLowerCase().slice(1),
      type: "document",
      extracted_at: new Date().toISOString(),
      note: "Document metadata extraction not implemented",
    };
  }
}
