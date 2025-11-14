// server/controllers/forumController.js
// Minimal placeholder controller to ensure route handlers are functions.
// Replace these with real implementations as you develop the forum features.

const { models } = require('../config/db');
const { Op } = require('sequelize');

// Helper: simple 501 placeholder for unimplemented endpoints
const notImplemented = (name) => async (req, res, next) => {
	try {
		res.status(501).json({ success: false, message: `${name} not implemented yet` });
	} catch (err) {
		next(err);
	}
};

// Implemented: getPublicQuestions (used by frontend)
const getPublicQuestions = async (req, res, next) => {
	try {
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.min(100, parseInt(req.query.limit) || 10);
		const offset = (page - 1) * limit;
		const search = (req.query.search || '').trim();
		const specialty = req.query.specialty; // numeric id or empty
		const tags = (req.query.tags || '').split(',').map(t => t.trim()).filter(Boolean);

		const where = { status: 'closed' }; // closed = đã duyệt (public)

		if (search) {
			where[Op.or] = [
				{ title: { [Op.like]: `%${search}%` } },
				{ content: { [Op.like]: `%${search}%` } }
			];
		}

		if (specialty) {
			const spId = parseInt(specialty);
			if (!isNaN(spId)) where.specialtyId = spId;
		}

		if (tags.length > 0) {
			// tags stored as JSON array; do a simple string match for now
			where.tags = { [Op.like]: `%${tags[0]}%` };
		}

		const result = await models.Question.findAndCountAll({
			where,
			include: [
				{ model: models.User, as: 'author', attributes: ['id', 'full_name', 'avatar_url'] },
				{ model: models.Specialty, as: 'specialty', attributes: ['id', 'name', 'slug'] }
			],
			order: [['created_at', 'DESC']],
			limit,
			offset
		});

		const questions = result.rows.map(q => ({
			id: q.id,
			title: q.title,
			content: q.content,
			author: q.author ? { id: q.author.id, full_name: q.author.full_name, avatar_url: q.author.avatar_url } : null,
			specialty: q.specialty ? { id: q.specialty.id, name: q.specialty.name, slug: q.specialty.slug } : null,
			tags: q.tags || [],
			images: q.images || [],
			viewsCount: q.viewsCount,
			views: q.viewsCount,
			answersCount: q.answersCount,
			answerCount: q.answersCount,
			likesCount: q.likesCount,
			created_at: q.created_at
		}));

		res.json({
			success: true,
			data: {
				questions,
				total: result.count,
				page,
				limit
			}
		});
	} catch (error) {
		next(error);
	}
};

module.exports = {
	getPublicQuestions,
		getForumOverview: notImplemented('getForumOverview'),
		getQuestionDetail: async (req, res, next) => {
			try {
				const id = parseInt(req.params.id);
				if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid question id' });

				const question = await models.Question.findByPk(id, {
					include: [
						{ model: models.User, as: 'author', attributes: ['id', 'full_name', 'avatar_url'] },
						{ model: models.Specialty, as: 'specialty', attributes: ['id', 'name', 'slug'] }
					]
				});

				if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

				// Load answers separately to control ordering and include authors
				const answers = await models.Answer.findAll({
					where: { questionId: id, isDeleted: false },
					include: [{ model: models.User, as: 'author', attributes: ['id', 'full_name', 'avatar_url'] }],
					order: [['created_at', 'ASC']]
				});

				// Track a unique view using Interaction model (count one per user or per IP)
				try {
					const whereView = { entity_type: 'question', entity_id: id, interaction_type: 'view' };
					if (req.user && req.user.id) {
						whereView.user_id = req.user.id;
					} else {
						// anonymous: track by ip address
						whereView.ip_address = req.ip || req.headers['x-forwarded-for'] || null;
					}

					const existingView = await models.Interaction.findOne({ where: whereView });
					if (!existingView) {
						await models.Interaction.create({
							user_id: req.user?.id || null,
							entity_type: 'question',
							entity_id: id,
							interaction_type: 'view',
							ip_address: req.ip || req.headers['x-forwarded-for'] || null,
							user_agent: req.headers['user-agent'] || null
						});
					}

					// Recalculate unique view count and save to question.viewsCount
					const uniqueViews = await models.Interaction.count({
						where: { entity_type: 'question', entity_id: id, interaction_type: 'view' }
					});
					question.viewsCount = uniqueViews;
					await question.save();

					// Broadcast view update to connected WS clients
					try {
						if (global.wsConnections) {
							const msg = JSON.stringify({
								type: 'forum_interaction',
								payload: {
									entity_type: 'question',
									entity_id: id,
									interaction_type: 'view',
									viewsCount: uniqueViews
								}
							});
							for (const [, ws] of global.wsConnections) {
								try {
									if (ws && ws.readyState === 1) ws.send(msg);
								} catch (e) {
									// ignore
								}
							}
						}
					} catch (e) {
						// ignore broadcast errors
					}
				} catch (err) {
					// ignore view tracking errors
				}

				const result = {
					id: question.id,
					title: question.title,
					content: question.content,
					author: question.author ? { id: question.author.id, full_name: question.author.full_name, avatar_url: question.author.avatar_url } : null,
					specialty: question.specialty ? { id: question.specialty.id, name: question.specialty.name, slug: question.specialty.slug } : null,
					tags: question.tags || [],
					images: question.images || [],
					status: question.status,
					viewsCount: question.viewsCount,
					answers: answers.map(a => ({
						id: a.id,
						content: a.content,
						author: a.author ? { id: a.author.id, full_name: a.author.full_name, avatar_url: a.author.avatar_url } : null,
						isPinned: a.isPinned,
						isVerified: a.isVerified,
						likesCount: a.likesCount,
						created_at: a.created_at
					}))
				};

				res.json({ success: true, data: result });
			} catch (error) {
				next(error);
			}
		},
		// Create a new question (authenticated or semi-authenticated via authenticateTokenBasic)
		createQuestion: async (req, res, next) => {
			try {
				// Require authenticated user (authenticateTokenBasic should set req.user)
				if (!req.user || !req.user.id) {
					return res.status(401).json({ success: false, message: 'Unauthorized' });
				}

				const { title, content, specialtyId, tags = [], images = [], isAnonymous = false } = req.body;

				if (!title || !content) {
					return res.status(400).json({ success: false, message: 'Title and content are required' });
				}

				const question = await models.Question.create({
					title: title.trim(),
					content: content.trim(),
					authorId: req.user.id,
					specialtyId: specialtyId || null,
					tags: Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim()).filter(Boolean),
					images: Array.isArray(images) ? images : [],
					isAnonymous: !!isAnonymous,
					status: 'open' // 'open' = pending approval
				});

				res.status(201).json({ success: true, data: { id: question.id } });
			} catch (error) {
				next(error);
			}
		},
	createAnswer: notImplemented('createAnswer'),
	createAnswer: async (req, res, next) => {
		try {
			if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
			const questionId = parseInt(req.params.id);
			if (isNaN(questionId)) return res.status(400).json({ success: false, message: 'Invalid question id' });
			const { content, isAnonymous = false } = req.body;
			if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

			const question = await models.Question.findByPk(questionId);
			if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

			const answer = await models.Answer.create({
				questionId,
				authorId: req.user.id,
				content: content.trim(),
				isDeleted: false
			});

			// increment answers count on question
			try {
				await question.increment('answersCount');
			} catch (err) {
				// ignore
			}

			const created = await models.Answer.findByPk(answer.id, {
				include: [{ model: models.User, as: 'author', attributes: ['id', 'full_name', 'avatar_url'] }]
			});

			// Record comment interaction for history
			try {
				await models.Interaction.create({
					user_id: req.user.id,
					entity_type: 'answer',
					entity_id: created.id,
					interaction_type: 'comment',
					metadata_json: { preview: created.content.substring(0, 200) }
				});
			} catch (err) {
				// ignore interaction recording errors
			}

			// Broadcast new answer so list/detail UIs can update in real-time
			try {
				if (global.wsConnections) {
					const msg = JSON.stringify({
						type: 'forum_interaction',
						payload: {
							entity_type: 'question',
							entity_id: questionId,
							interaction_type: 'comment',
							answersCount: question.answersCount + 1,
							answer: {
								id: created.id,
								content: created.content,
								author: created.author ? { id: created.author.id, full_name: created.author.full_name, avatar_url: created.author.avatar_url } : null,
								created_at: created.created_at
							}
						}
					});
					for (const [, ws] of global.wsConnections) {
						try { if (ws && ws.readyState === 1) ws.send(msg); } catch (e) {}
					}
				}
			} catch (e) {}

			res.status(201).json({ success: true, data: created });
		} catch (error) {
			next(error);
		}
	},
		toggleLikeQuestion: async (req, res, next) => {
		try {
			if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
			const id = parseInt(req.params.id);
			if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid question id' });

			const question = await models.Question.findByPk(id);
			if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

			// Use Interaction to record likes per user (unique)
			const existing = await models.Interaction.findOne({
				where: { entity_type: 'question', entity_id: id, interaction_type: 'like', user_id: req.user.id }
			});
			let liked = false;
			if (existing) {
				await existing.destroy();
				liked = false;
			} else {
				await models.Interaction.create({
					user_id: req.user.id,
					entity_type: 'question',
					entity_id: id,
					interaction_type: 'like'
				});
				liked = true;
			}

			// Recalculate likesCount from interactions
			const likesCount = await models.Interaction.count({ where: { entity_type: 'question', entity_id: id, interaction_type: 'like' } });
			question.likesCount = likesCount;
			await question.save();

			// Broadcast like update
			try {
				if (global.wsConnections) {
					const msg = JSON.stringify({
						type: 'forum_interaction',
						payload: {
							entity_type: 'question',
							entity_id: id,
							interaction_type: 'like',
							likesCount
						}
					});
					for (const [, ws] of global.wsConnections) {
						try { if (ws && ws.readyState === 1) ws.send(msg); } catch (e) {}
					}
				}
			} catch (e) {}

			res.json({ success: true, data: { id: question.id, likesCount, liked } });
		} catch (error) {
			next(error);
		}
	},
		toggleLikeAnswer: async (req, res, next) => {
		try {
			if (!req.user || !req.user.id) return res.status(401).json({ success: false, message: 'Unauthorized' });
			const id = parseInt(req.params.id);
			if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid answer id' });

			const answer = await models.Answer.findByPk(id);
			if (!answer) return res.status(404).json({ success: false, message: 'Answer not found' });

			const existing = await models.Interaction.findOne({
				where: { entity_type: 'answer', entity_id: id, interaction_type: 'like', user_id: req.user.id }
			});
			let liked = false;
			if (existing) {
				await existing.destroy();
				liked = false;
			} else {
				await models.Interaction.create({
					user_id: req.user.id,
					entity_type: 'answer',
					entity_id: id,
					interaction_type: 'like'
				});
				liked = true;
			}

			const likesCount = await models.Interaction.count({ where: { entity_type: 'answer', entity_id: id, interaction_type: 'like' } });
			answer.likesCount = likesCount;
			await answer.save();

			// Broadcast answer like update
			try {
				if (global.wsConnections) {
					const msg = JSON.stringify({
						type: 'forum_interaction',
						payload: {
							entity_type: 'answer',
							entity_id: id,
							interaction_type: 'like',
							likesCount
						}
					});
					for (const [, ws] of global.wsConnections) {
						try { if (ws && ws.readyState === 1) ws.send(msg); } catch (e) {}
					}
				}
			} catch (e) {}

			res.json({ success: true, data: { id: answer.id, likesCount, liked } });
		} catch (error) {
			next(error);
		}
	},
	createReport: notImplemented('createReport'),
	// Admin: list all questions with filters (status, search, specialty)
	getAllQuestions: async (req, res, next) => {
		try {
			const page = Math.max(1, parseInt(req.query.page) || 1);
			const limit = Math.min(200, parseInt(req.query.limit) || 50);
			const offset = (page - 1) * limit;
			const status = req.query.status; // 'open' | 'closed' | 'hidden'
			const search = (req.query.search || '').trim();
			const specialty = req.query.specialty;
			
			const where = {};
			if (status) where.status = status;
			if (search) {
				where[Op.or] = [
					{ title: { [Op.like]: `%${search}%` } },
					{ content: { [Op.like]: `%${search}%` } }
				];
			}
			if (specialty) {
				const spId = parseInt(specialty);
				if (!isNaN(spId)) where.specialtyId = spId;
			}
			
			const result = await models.Question.findAndCountAll({
				where,
				include: [
					{ model: models.User, as: 'author', attributes: ['id', 'username', 'full_name', 'email'] },
					{ model: models.Specialty, as: 'specialty', attributes: ['id', 'name'] }
				],
				order: [['created_at', 'DESC']],
				limit,
				offset
			});
			
			const questions = result.rows.map(q => ({
				id: q.id,
				title: q.title,
				status: q.status,
				author: q.author ? { id: q.author.id, username: q.author.username, full_name: q.author.full_name, email: q.author.email } : null,
				specialty: q.specialty ? { id: q.specialty.id, name: q.specialty.name } : null,
				created_at: q.created_at,
				answersCount: q.answersCount,
				likesCount: q.likesCount
			}));
			
			res.json({ success: true, data: { questions, total: result.count, page, limit } });
		} catch (error) {
			next(error);
		}
	},
	updateQuestionStatus: notImplemented('updateQuestionStatus'),
	deleteQuestion: notImplemented('deleteQuestion'),
	deleteAnswer: notImplemented('deleteAnswer'),
	togglePinAnswer: notImplemented('togglePinAnswer'),
	toggleVerifyAnswer: notImplemented('toggleVerifyAnswer'),
	getReports: notImplemented('getReports'),
	updateReport: notImplemented('updateReport'),

	// Admin: update question status (approve/reject)
	updateQuestionStatus: async (req, res, next) => {
		try {
			if (!req.user || !req.user.id) {
				return res.status(401).json({ success: false, message: 'Unauthorized' });
			}

			const id = parseInt(req.params.id);
			if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid question id' });

			const { status, reason } = req.body;
			const allowed = ['open', 'closed', 'hidden'];
			if (!status || !allowed.includes(status)) {
				return res.status(400).json({ success: false, message: 'Invalid status value' });
			}

			const question = await models.Question.findByPk(id);
			if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

			if (status === 'closed') {
				question.status = 'closed';
				question.approvedAt = new Date();
				question.approvedBy = req.user.id;
				question.rejectionReason = null;
			} else if (status === 'hidden') {
				question.status = 'hidden';
				question.rejectionReason = reason || null;
				question.approvedAt = null;
				question.approvedBy = null;
			} else if (status === 'open') {
				question.status = 'open';
				question.rejectionReason = null;
				question.approvedAt = null;
				question.approvedBy = null;
			}

			await question.save();

			res.json({ success: true, data: { id: question.id, status: question.status } });
		} catch (error) {
			next(error);
		}
	}
};
