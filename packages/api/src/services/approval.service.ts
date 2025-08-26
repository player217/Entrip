import { PrismaClient, Approval, ApprovalStep, ApprovalStatus, ApprovalTargetType, ApprovalAction } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface ApprovalCreateDto {
  title: string;
  content: string;
  targetType: ApprovalTargetType;
  targetId?: string;
  amount?: number;
  currency?: string;
  steps: {
    approverId: string;
    order: number;
  }[];
  requesterId: string;
}

export interface ApprovalUpdateDto {
  title?: string;
  content?: string;
  status?: ApprovalStatus;
  steps?: {
    approverId: string;
    order: number;
  }[];
}

export interface ApprovalQueryDto {
  page?: number;
  limit?: number;
  status?: ApprovalStatus;
  requesterId?: string;
  approverId?: string;
  targetType?: ApprovalTargetType;
  targetId?: string;
}

export interface ApprovalActionDto {
  action: ApprovalAction;
  comment?: string;
}

export interface ApprovalWithSteps extends Approval {
  steps: ApprovalStep[];
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * List approvals with pagination and filters
 */
export const listApprovals = async (query: ApprovalQueryDto): Promise<{
  data: ApprovalWithSteps[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  const { page = 1, limit = 20, status, requesterId, approverId, targetType, targetId } = query;

  const where = {
    deletedAt: null, // Only non-deleted approvals
    ...(status && { status }),
    ...(requesterId && { requesterId }),
    ...(targetType && { targetType }),
    ...(targetId && { targetId }),
    ...(approverId && {
      steps: {
        some: {
          approverId,
        },
      },
    }),
  };

  const [total, approvals] = await Promise.all([
    prisma.approval.count({ where }),
    prisma.approval.findMany({
      where,
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: approvals,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single approval by ID with steps
 */
export const getApprovalById = async (id: string): Promise<ApprovalWithSteps | null> => {
  return prisma.approval.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Create a new approval request
 */
export const createApproval = async (dto: ApprovalCreateDto): Promise<ApprovalWithSteps> => {
  return prisma.approval.create({
    data: {
      title: dto.title,
      content: dto.content,
      targetType: dto.targetType,
      targetId: dto.targetId,
      amount: dto.amount ? String(dto.amount) : null,
      currency: dto.currency || 'KRW',
      requesterId: dto.requesterId,
      steps: {
        create: dto.steps.map(step => ({
          approverId: step.approverId,
          order: step.order,
        })),
      },
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Update an existing approval
 */
export const updateApproval = async (id: string, dto: ApprovalUpdateDto): Promise<ApprovalWithSteps> => {
  const updateData: Partial<{title: string; content: string; status: ApprovalStatus; amount?: number; currency?: string}> = {};
  
  if (dto.title !== undefined) updateData.title = dto.title;
  if (dto.content !== undefined) updateData.content = dto.content;
  if (dto.status !== undefined) updateData.status = dto.status;

  // Handle steps update if provided
  if (dto.steps !== undefined) {
    // Delete existing steps and create new ones
    await prisma.approvalStep.deleteMany({
      where: { approvalId: id },
    });
    
    (updateData as any).steps = {
      create: dto.steps.map(step => ({
        approverId: step.approverId,
        order: step.order,
      })),
    };
  }

  return prisma.approval.update({
    where: { id },
    data: updateData,
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Process approval action (approve/reject) for current step
 */
export const processApprovalAction = async (
  id: string, 
  dto: ApprovalActionDto, 
  actorId: string
): Promise<ApprovalWithSteps> => {
  const approval = await getApprovalById(id);
  
  if (!approval) {
    throw new Error('Approval not found');
  }

  if (approval.status !== 'pending') {
    throw new Error(`Cannot ${dto.action} ${approval.status} approval`);
  }

  // Get current step
  const currentStep = approval.steps[approval.currentStep];
  if (!currentStep) {
    throw new Error('No more approval steps');
  }

  // Check if user is authorized for this step
  if (currentStep.approverId !== actorId) {
    throw new Error('Not authorized to approve at this step');
  }

  // Check if step already has action
  if (currentStep.action) {
    throw new Error('This step has already been acted upon');
  }

  // Update the step with action
  await prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: {
      action: dto.action,
      comment: dto.comment,
      actedAt: new Date(),
    },
  });

  // Update approval status based on action
  let newStatus: ApprovalStatus = approval.status;
  let newCurrentStep = approval.currentStep;

  if (dto.action === 'reject') {
    newStatus = 'rejected';
  } else {
    // Move to next step
    newCurrentStep++;
    
    if (newCurrentStep >= approval.steps.length) {
      // All steps completed
      newStatus = 'approved';
    }
  }

  // Update approval
  return prisma.approval.update({
    where: { id },
    data: {
      status: newStatus,
      currentStep: newCurrentStep,
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Cancel an approval request
 */
export const cancelApproval = async (id: string): Promise<ApprovalWithSteps> => {
  return prisma.approval.update({
    where: { id },
    data: { status: 'cancelled' },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Soft delete an approval
 */
export const deleteApproval = async (id: string): Promise<ApprovalWithSteps> => {
  return prisma.approval.update({
    where: { id },
    data: { deletedAt: new Date() },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Get approval statistics
 */
export const getApprovalStats = async (year?: number, month?: number) => {
  const whereCondition: Record<string, unknown> = { deletedAt: null };
  
  if (year !== undefined) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);
    
    if (month !== undefined) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 1);
      
      whereCondition.createdAt = {
        gte: startOfMonth,
        lt: endOfMonth,
      };
    } else {
      whereCondition.createdAt = {
        gte: startOfYear,
        lt: endOfYear,
      };
    }
  }

  const [total, byStatus, avgApprovalTime] = await Promise.all([
    prisma.approval.count({ where: whereCondition }),
    prisma.approval.groupBy({
      by: ['status'],
      where: whereCondition,
      _count: { id: true },
    }),
    getAverageApprovalTime(whereCondition),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<ApprovalStatus, number>),
    avgApprovalTimeHours: avgApprovalTime,
  };
};

/**
 * Calculate average approval time for approved requests
 */
async function getAverageApprovalTime(whereCondition: Record<string, unknown>): Promise<number> {
  const approvedApprovals = await prisma.approval.findMany({
    where: {
      ...whereCondition,
      status: 'approved',
    },
    include: {
      steps: {
        where: { action: 'approve' },
        orderBy: { order: 'desc' },
        take: 1, // Get the last approval step
      },
    },
  });

  if (approvedApprovals.length === 0) return 0;

  const totalTime = approvedApprovals.reduce((sum, approval) => {
    const lastStep = approval.steps[0];
    if (lastStep && lastStep.actedAt) {
      const timeDiff = lastStep.actedAt.getTime() - approval.createdAt.getTime();
      return sum + timeDiff;
    }
    return sum;
  }, 0);

  // Return average time in hours
  return Math.round(totalTime / approvedApprovals.length / (1000 * 60 * 60));
}

/**
 * Get pending approvals for a specific user
 */
export const getPendingApprovalsForUser = async (userId: string): Promise<ApprovalWithSteps[]> => {
  return prisma.approval.findMany({
    where: {
      deletedAt: null,
      status: 'pending',
      steps: {
        some: {
          approverId: userId,
          action: null, // No action taken yet
        },
      },
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' }, // Oldest first for pending items
  });
};

/**
 * Get approvals by target (e.g., finance record)
 */
export const getApprovalsByTarget = async (
  targetType: ApprovalTargetType, 
  targetId: string
): Promise<ApprovalWithSteps[]> => {
  return prisma.approval.findMany({
    where: {
      deletedAt: null,
      targetType,
      targetId,
    },
    include: {
      steps: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Clean up function to close Prisma connection
 */
export const closePrismaConnection = async () => {
  await prisma.$disconnect();
};
