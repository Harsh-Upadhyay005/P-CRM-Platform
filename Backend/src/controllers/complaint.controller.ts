import { Request, Response } from 'express';
import { prisma } from '../db';

// Public complaint creation (no auth required)
export const createPublicComplaint = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      fullName,
      email,
      phone,
      state,
      city,
      pincode,
      address,
      departmentId,
    } = req.body;

    // Validate required fields
    if (!title || !description || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: 'Title, description, full name, email and phone are required',
      });
    }

    // Generate a unique tracking ID
    const trackingId = `CMP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category: category || 'GENERAL',
        trackingId,
        status: 'OPEN',
        priority: 'MEDIUM',
        complainantName: fullName,
        complainantEmail: email,
        complainantPhone: phone,
        state: state || null,
        city: city || null,
        pincode: pincode || null,
        address: address || null,
        ...(departmentId ? { departmentId } : {}),
      },
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Complaint submitted successfully',
      data: { trackingId: complaint.trackingId },
    });
  } catch (error: any) {
    console.error('Public complaint creation error:', error);

    // Handle Prisma unknown field errors
    if (error?.code === 'P2002') {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: 'A complaint with this tracking ID already exists',
      });
    }

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error?.message || 'Failed to submit complaint',
    });
  }
};