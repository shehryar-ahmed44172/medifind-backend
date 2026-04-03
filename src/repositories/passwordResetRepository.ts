import { prisma } from '../config';

export class PasswordResetRepository {
	/**
	 * Create password reset token record
	 */
	async createResetToken(
		userId: string,
		tokenHash: string,
		expiresAt: Date
	) {
		return prisma.passwordReset.create({
			data: {
				userId,
				tokenHash,
				expiresAt,
			},
		});
	}

	/**
	 * Find active reset token by hash
	 */
	async findActiveToken(tokenHash: string) {
		return prisma.passwordReset.findFirst({
			where: {
				tokenHash,
				usedAt: null, // Not yet used
				expiresAt: { gte: new Date() }, // Not expired
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						passwordHash: true,
					},
				},
			},
		});
	}

	/**
	 * Mark reset token as used
	 */
	async markTokenAsUsed(tokenId: string) {
		return prisma.passwordReset.update({
			where: { id: tokenId },
			data: { usedAt: new Date() },
		});
	}

	/**
	 * Delete expired tokens (cleanup)
	 */
	async deleteExpiredTokens() {
		return prisma.passwordReset.deleteMany({
			where: {
				expiresAt: { lt: new Date() },
			},
		});
	}

	/**
	 * Get recent reset tokens for user (prevent abuse)
	 */
	async getRecentResetRequests(userId: string, hoursAgo: number = 24) {
		const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
		return prisma.passwordReset.findMany({
			where: {
				userId,
				createdAt: { gte: since },
			},
			orderBy: { createdAt: 'desc' },
		});
	}
}

export const passwordResetRepository = new PasswordResetRepository();