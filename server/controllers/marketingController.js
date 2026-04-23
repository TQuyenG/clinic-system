const { models, sequelize } = require('../config/db');
const { Op } = require('sequelize');

const marketingController = {
  // === 1. LOGIC SỰ KIỆN ===
  
  // Lấy sự kiện Popup cho trang chủ
  getPopupEvent: async (req, res) => {
    try {
      const event = await models.Event.findOne({
        where: {
          is_active: true,
          is_popup: true,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() }
        },
        order: [['created_at', 'DESC']] // Lấy cái mới nhất
      });
      res.json({ success: true, event });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Lấy chi tiết sự kiện theo ID hoặc Slug
  // ✅ SAU KHI SỬA:
  getEventDetail: async (req, res) => {
    try {
      const { id } = req.params;
      
      let whereCondition = {};
      
      if (!isNaN(id)) {
        whereCondition = { id: id };
      } else {
        whereCondition = { slug: id };
      }

      const event = await models.Event.findOne({
        where: {
          ...whereCondition,
          is_active: true
        }
      });

      if (!event) {
        return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
      }

      // Tăng lượt xem
      await event.increment('views');
      
      // Reload để lấy giá trị views mới
      await event.reload();

      // Xử lý đường dẫn hình ảnh
      const eventData = event.toJSON();
      const eventWithImages = {
        ...eventData,
        thumbnail: eventData.thumbnail ? 
          (eventData.thumbnail.startsWith('http') ? eventData.thumbnail : `${process.env.BASE_URL || 'http://localhost:3001'}${eventData.thumbnail}`) 
          : null,
        banner_url: eventData.banner_url ? 
          (eventData.banner_url.startsWith('http') ? eventData.banner_url : `${process.env.BASE_URL || 'http://localhost:3001'}${eventData.banner_url}`) 
          : null,
        gallery: Array.isArray(eventData.gallery) ? 
          eventData.gallery.map(img => img.startsWith('http') ? img : `${process.env.BASE_URL || 'http://localhost:3001'}${img}`) 
          : []
      };

      res.json({ success: true, event: eventWithImages });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Lấy danh sách sự kiện (có phân trang)
  getEvents: async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        event_type, 
        status, 
        sort_by = 'start_date',
        order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};
      
      // Filter by search
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Filter by event type
      if (event_type && event_type !== 'all') {
        where.event_type = event_type;
      }

      // Filter by status
      const now = new Date();
      if (status === 'upcoming') {
        where.start_date = { [Op.gt]: now };
        where.is_active = true;
      } else if (status === 'ongoing') {
        where.start_date = { [Op.lte]: now };
        where.end_date = { [Op.gte]: now };
        where.is_active = true;
      } else if (status === 'ended') {
        where.end_date = { [Op.lt]: now };
      } else if (status === 'active') {
        where.is_active = true;
      } else if (status === 'inactive') {
        where.is_active = false;
      }

      // Default: only show active events for public
      if (!status) {
        where.is_active = true;
      }

      // Sorting options
      let orderClause = [];
      if (sort_by === 'views') {
        orderClause = [['views', order.toUpperCase()]];
      } else if (sort_by === 'clicks') {
        orderClause = [['clicks', order.toUpperCase()]];
      } else if (sort_by === 'created_at') {
        orderClause = [['created_at', order.toUpperCase()]];
      } else {
        orderClause = [['start_date', order.toUpperCase()]];
      }

      const { count, rows } = await models.Event.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: orderClause,
        attributes: {
          include: [
            [sequelize.literal('views'), 'views'],
            [sequelize.literal('clicks'), 'clicks']
          ]
        }
      });

      // Process image URLs
      const eventsWithImages = rows.map(event => {
        const eventData = event.toJSON();
        const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        
        return {
          ...eventData,
          thumbnail: eventData.thumbnail ? 
            (eventData.thumbnail.startsWith('http') ? eventData.thumbnail : `${baseUrl}${eventData.thumbnail}`) 
            : null,
          banner_url: eventData.banner_url ? 
            (eventData.banner_url.startsWith('http') ? eventData.banner_url : `${baseUrl}${eventData.banner_url}`) 
            : null,
          gallery: Array.isArray(eventData.gallery) ? 
            eventData.gallery.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`) 
            : []
        };
      });

      res.json({ 
        success: true, 
        events: eventsWithImages, 
        total: count, 
        page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // === 2. LOGIC GAME & VOUCHER ===

  // Lấy danh sách quà tặng cho vòng quay
  getGameRewards: async (req, res) => {
    try {
      const rewards = await models.Promotion.findAll({
        where: {
          is_active: true,
          is_game_reward: true,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() }
        },
        attributes: ['id', 'name', 'discount_value', 'discount_type', 'game_probability']
      });
      res.json({ success: true, rewards });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Chơi game: Vòng quay may mắn / Điểm danh
  playGame: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const costPerSpin = 10; // Cần 10 điểm cho 1 lần quay

      // 1. Kiểm tra điểm của user
      const user = await models.User.findByPk(userId, { transaction });
      if ((user.reward_points || 0) < costPerSpin) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Bạn cần ${costPerSpin} điểm để quay. Hãy điểm danh nhé!` });
      }

      // Trừ điểm ngay khi bắt đầu quay
      user.reward_points -= costPerSpin;
      await user.save({ transaction });
      
      // Tìm các voucher user đã nhận hôm nay qua game
      // (Bạn có thể tạo bảng GameHistory riêng nếu muốn chặt chẽ hơn, ở đây dùng UserVoucher để check nhanh)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const playedToday = await models.UserVoucher.count({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: startOfDay }
        }
      });

      if (playedToday >= 3) { // Giới hạn 3 lần nhận quà/ngày
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Bạn đã hết lượt chơi hôm nay!' });
      }

      // Lấy danh sách quà trong kho (Promotion có flag is_game_reward)
      const rewards = await models.Promotion.findAll({
        where: {
          is_active: true,
          is_game_reward: true,
          usage_count: { [Op.lt]: sequelize.col('usage_limit') }, // Còn lượt dùng
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() }
        }
      });

      if (rewards.length === 0) {
        await transaction.rollback();
        return res.json({ success: true, result: 'miss', message: 'Chúc bạn may mắn lần sau!' });
      }

      // --- ALGORITHM RANDOM THEO TỶ LỆ ---
      let selectedReward = null;
      const random = Math.random() * 100; // 0 - 100
      let cumulativeProbability = 0;

      for (const reward of rewards) {
        cumulativeProbability += reward.game_probability;
        if (random <= cumulativeProbability) {
          selectedReward = reward;
          break;
        }
      }
      // ------------------------------------

      if (selectedReward) {
        // Cộng voucher cho user
        await models.UserVoucher.create({
          user_id: userId,
          promotion_id: selectedReward.id
        }, { transaction });

        // Tăng đếm usage của voucher
        await selectedReward.increment('usage_count', { transaction });

        await transaction.commit();
        return res.json({ 
          success: true, 
          result: 'win', 
          reward: selectedReward,
          message: `Chúc mừng! Bạn nhận được ${selectedReward.name}` 
        });
      } else {
        await transaction.commit();
        return res.json({ success: true, result: 'miss', message: 'Suýt trúng rồi! Thử lại nhé.' });
      }

    } catch (error) {
      await transaction.rollback();
      console.error(error);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống game' });
    }
  },

  // Lấy danh sách Voucher của tôi
  getMyVouchers: async (req, res) => {
    try {
      const vouchers = await models.UserVoucher.findAll({
        where: { user_id: req.user.id, is_used: false },
        include: [{
          model: models.Promotion,
          where: { end_date: { [Op.gte]: new Date() } } // Chỉ lấy voucher chưa hết hạn
        }]
      });
      res.json({ success: true, vouchers });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ✅ THÊM MỚI 1: Lấy danh sách Voucher đang phát hành (Kho chung)
  getPublicPromotions: async (req, res) => {
    try {
      const promotions = await models.Promotion.findAll({
        where: {
          is_active: true,
          is_game_reward: false, // Chỉ lấy mã thường, bỏ qua mã vòng quay
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() },
          usage_count: { [Op.lt]: sequelize.col('usage_limit') } // Chỉ hiện mã còn số lượng
        },
        order: [['created_at', 'DESC']]
      });
      res.json({ success: true, promotions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ✅ THÊM MỚI 2: Xử lý hành động "Lưu mã" của người dùng
  claimVoucher: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user.id;
      const { promotion_id } = req.body;

      // Kiểm tra Promotion có tồn tại và còn hạn không
      const promotion = await models.Promotion.findOne({
        where: { id: promotion_id, is_active: true, is_game_reward: false },
        transaction
      });

      if (!promotion) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Voucher không tồn tại hoặc đã hết hạn.' });
      }

      // Kiểm tra còn lượt không
      if (promotion.usage_count >= promotion.usage_limit) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Rất tiếc, voucher này đã được thu thập hết.' });
      }

      // Kiểm tra user đã lưu chưa
      const existing = await models.UserVoucher.findOne({
        where: { user_id: userId, promotion_id },
        transaction
      });

      if (existing) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Bạn đã lưu voucher này trong ví rồi.' });
      }

      // Cấp voucher cho user & trừ đi 1 lượt phát hành
      await models.UserVoucher.create({ user_id: userId, promotion_id }, { transaction });
      await promotion.increment('usage_count', { transaction });

      await transaction.commit();
      res.json({ success: true, message: 'Lưu mã thành công! Đã thêm vào Ví của bạn.' });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu mã' });
    }
  },

  // ✅ THÊM MỚI: Logic lấy điểm hiện tại
  getMyPoints: async (req, res) => {
    try {
      const user = await models.User.findByPk(req.user.id);
      res.json({ success: true, points: user.reward_points || 0 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ✅ THÊM MỚI: Logic điểm danh hằng ngày
  dailyCheckin: async (req, res) => {
    try {
      const user = await models.User.findByPk(req.user.id);

      // Kiểm tra hôm nay đã điểm danh chưa bằng last_checkin_date trong User
      const today = new Date().toISOString().slice(0, 10); // "2026-02-25"
      const lastCheckin = user.last_checkin_date 
        ? new Date(user.last_checkin_date).toISOString().slice(0, 10) 
        : null;

      if (lastCheckin === today) {
        return res.status(400).json({ 
          success: false, 
          message: 'Bạn đã điểm danh hôm nay rồi! Quay lại vào ngày mai nhé.' 
        });
      }

      user.reward_points = (user.reward_points || 0) + 10;
      user.last_checkin_date = new Date();
      await user.save();
      res.json({ success: true, points: user.reward_points, message: 'Điểm danh thành công! Bạn nhận được 10 điểm.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lỗi điểm danh' });
    }
  },

  // ✅ THÊM MỚI: Logic đổi điểm lấy voucher
  // SAU KHI SỬA
  // ✅ LOGIC MỚI: Đổi voucher CỤ THỂ theo ID do khách hàng chọn
  exchangePoints: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const user = await models.User.findByPk(req.user.id);
      const promoId = req.params.promoId; // Lấy ID Voucher từ URL

      // Tìm voucher khách hàng muốn đổi
      const reward = await models.Promotion.findOne({
        where: { id: promoId, is_active: true, is_game_reward: false }
      });

      if (!reward) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Voucher không tồn tại hoặc đã hết hạn!' });
      }

      if (reward.usage_count >= reward.usage_limit) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Rất tiếc, voucher này đã được đổi hết!' });
      }

      // Kiểm tra user đã có mã này trong ví chưa
      const existing = await models.UserVoucher.findOne({ where: { user_id: user.id, promotion_id: reward.id } });
      if (existing) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Bạn đã có mã này trong ví rồi!' });
      }

      // SAU KHI SỬA
      // ✅ Lấy chính xác số điểm do Admin cấu hình từ Database
      const pointsNeeded = reward.exchange_points || 50;

      if ((user.reward_points || 0) < pointsNeeded) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: `Bạn cần ${pointsNeeded} điểm để đổi quà này!` });
      }

      // Trừ điểm và cấp voucher vào ví
      user.reward_points -= pointsNeeded;
      await user.save({ transaction });

      await models.UserVoucher.create({ user_id: user.id, promotion_id: reward.id }, { transaction });
      await reward.increment('usage_count', { transaction });

      await transaction.commit();
      res.json({ success: true, points: user.reward_points, message: `Thành công! Bạn vừa dùng ${pointsNeeded} điểm để đổi: ${reward.name}` });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({ success: false, message: 'Lỗi đổi quà' });
    }
  },
  // === 3. ADMIN FUNCTIONS (Thêm vào marketingController) ===

  // Tạo sự kiện mới
   createEvent: async (req, res) => {
    try {
      const { 
        title, content, start_date, end_date, is_popup, 
        thumbnail, banner_url, description, 
        event_type, popup_config, cta_config,
        gallery, location
      } = req.body;

      // Validation
      if (!title || !start_date || !end_date) {
        return res.status(400).json({ 
          success: false, 
          message: 'Vui lòng điền đầy đủ tiêu đề, ngày bắt đầu và kết thúc' 
        });
      }

      // Tạo slug từ title
      const slug = title.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + Date.now();

      // Parse gallery nếu là string JSON
      let galleryArray = [];
      if (gallery) {
        galleryArray = typeof gallery === 'string' ? JSON.parse(gallery) : gallery;
      }

      const newEvent = await models.Event.create({
        title, 
        slug, 
        content, 
        start_date, 
        end_date, 
        is_popup: is_popup || false, 
        thumbnail, 
        banner_url, 
        description,
        event_type: event_type || 'event',
        popup_config: popup_config ? 
          (typeof popup_config === 'string' ? JSON.parse(popup_config) : popup_config) : 
          { delay: 0, frequency: 'once_per_day', display_pages: ['home'] },
        cta_config: cta_config ? 
          (typeof cta_config === 'string' ? JSON.parse(cta_config) : cta_config) : 
          { text: 'Xem chi tiết', type: 'internal', link: '' },
        gallery: galleryArray,
        location: location || ''
      });

      res.json({ success: true, event: newEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
  // Xóa sự kiện
  deleteEvent: async (req, res) => {
    try {
      await models.Event.destroy({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Đã xóa sự kiện' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // khuyếnmãi tạo mã mới

  createPromotion: async (req, res) => {
    try {
      const { 
        code, name, discount_value, usage_limit, 
        start_date, end_date, // <--- Quan trọng: Phải nhận đủ ngày
        is_game_reward, game_probability,
        // Các trường mới:
        min_order_value, max_discount_amount, apply_for, game_type, discount_type,
        reward_type, external_code, reward_image_url,
        is_exchange_reward, exchange_points // ✅ THÊM 2 TRƯỜNG ĐỔI ĐIỂM VÀO ĐÂY
      } = req.body;

      // Validate ngày tháng để tránh lỗi 500
      if (!start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn ngày bắt đầu và kết thúc!' });
      }

      // Validate tỷ lệ trúng thưởng
      if (is_game_reward && (game_probability < 0 || game_probability > 100)) {
        return res.status(400).json({ success: false, message: 'Tỷ lệ trúng thưởng phải từ 0 đến 100%' });
      }

      const newPromo = await models.Promotion.create({
        code: code.toUpperCase(), 
        name, 
        discount_value, 
        discount_type: discount_type || 'percentage',
        usage_limit, 
        start_date,
        end_date,
        min_order_value: min_order_value || 0,
        max_discount_amount: max_discount_amount || null,
        apply_for: apply_for || 'all',
        is_game_reward: is_game_reward || false,
        game_type: is_game_reward ? (game_type || 'lucky_wheel') : 'none',
        game_probability: game_probability || 0,
        description: req.body.description || null, 
        applicable_ids: req.body.applicable_ids ? req.body.applicable_ids.join(',') : null,
        // ✅ BỔ SUNG LƯU DATABASE
        reward_type: is_game_reward ? (reward_type || 'voucher') : 'voucher',
        external_code: external_code || null,
        reward_image_url: reward_image_url || null,
        
        // ✅ LƯU TRƯỜNG CỦA CỬA HÀNG ĐỔI ĐIỂM VÀO DATABASE
        is_exchange_reward: is_exchange_reward || false,
        exchange_points: exchange_points || 0
      });
      res.json({ success: true, promotion: newPromo });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({ success: false, message: error.message || 'Lỗi tạo mã khuyến mãi' });
    }
  },

  // Lấy danh sách Voucher (Admin)
  getAllPromotions: async (req, res) => {
    try {
      const promotions = await models.Promotion.findAll({ 
        order: [['created_at', 'DESC']],
        attributes: { 
          include: [
            // Tính tự động trạng thái running/expired/upcoming
            [sequelize.literal(`CASE 
              WHEN end_date < NOW() THEN 'expired'
              WHEN start_date > NOW() THEN 'upcoming'
              WHEN usage_count >= usage_limit THEN 'exhausted'
              ELSE 'running' END`), 'status']
          ]
        }
      });
      res.json({ success: true, promotions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Xóa Voucher
  deletePromotion: async (req, res) => {
    try {
      await models.Promotion.destroy({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Đã xóa khuyến mãi' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
  // Toggle trạng thái nhanh (Active/Inactive)
  toggleEventStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await models.Event.findByPk(id);
      if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

      // Đảo ngược trạng thái
      event.is_active = !event.is_active;
      await event.save();

      res.json({ success: true, is_active: event.is_active, message: 'Đã cập nhật trạng thái' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Tracking thống kê (Click/View)
  trackEventStats: async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'view' hoặc 'click'
      
      if (type === 'click') {
        await models.Event.increment('clicks', { where: { id } });
      } else {
        await models.Event.increment('views', { where: { id } });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  },

  // === 4. CÁC HÀM CẬP NHẬT & TIỆN ÍCH (THÊM MỚI) ===

  // Cập nhật sự kiện (Update)
  updateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        title, content, start_date, end_date, is_popup, 
        thumbnail, banner_url, description, event_type, 
        popup_config, cta_config, gallery, location 
      } = req.body;
      
      const event = await models.Event.findByPk(id);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }

      // Generate new slug if title changed
      let slug = event.slug;
      if (title && title !== event.title) {
        slug = title.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'D')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
          + '-' + Date.now();
      }

      // Parse gallery if string
      let galleryArray = event.gallery;
      if (gallery !== undefined) {
        galleryArray = typeof gallery === 'string' ? JSON.parse(gallery) : gallery;
      }

      // Update event
      await event.update({
        title: title || event.title,
        slug,
        content: content || event.content,
        start_date: start_date || event.start_date,
        end_date: end_date || event.end_date,
        is_popup: is_popup !== undefined ? is_popup : event.is_popup,
        thumbnail: thumbnail || event.thumbnail,
        banner_url: banner_url || event.banner_url,
        description: description || event.description,
        event_type: event_type || event.event_type,
        popup_config: popup_config ? 
          (typeof popup_config === 'string' ? JSON.parse(popup_config) : popup_config) : 
          event.popup_config,
        cta_config: cta_config ? 
          (typeof cta_config === 'string' ? JSON.parse(cta_config) : cta_config) : 
          event.cta_config,
        gallery: galleryArray,
        location: location !== undefined ? location : event.location
      });

      res.json({ success: true, event });
    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Cập nhật khuyến mãi (Update)
  updatePromotion: async (req, res) => {
    try {
      const { id } = req.params;
      const promo = await models.Promotion.findByPk(id);
      if (!promo) return res.status(404).json({ success: false, message: 'Không tìm thấy khuyến mãi' });
      
      const updateData = { ...req.body };
      // Xử lý mảng thành chuỗi để lưu vào DB (Fix lỗi 500)
      if (Array.isArray(updateData.applicable_ids)) {
          updateData.applicable_ids = updateData.applicable_ids.join(',');
      } else if (updateData.applicable_ids === null || updateData.applicable_ids === '') {
          updateData.applicable_ids = null;
      }

      await promo.update(updateData);
      res.json({ success: true, promotion: promo });
    } catch (error) {
      console.error('Lỗi update voucher:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Bật/Tắt nhanh trạng thái (Toggle)
  toggleEventStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await models.Event.findByPk(id);
      if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });

      event.is_active = !event.is_active;
      await event.save();

      res.json({ success: true, is_active: event.is_active });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Tracking thống kê (Click/View)
  trackEventStats: async (req, res) => {
    try {
      const { id } = req.params;
      const { type } = req.body; // 'view' hoặc 'click'
      
      if (type === 'click') {
        await models.Event.increment('clicks', { where: { id } });
      } else {
        await models.Event.increment('views', { where: { id } });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  },
  // ✅ THÊM MỚI (trước dòng module.exports):
  // Thống kê sự kiện
  getEventStats: async (req, res) => {
    try {
      const { event_id, start_date, end_date } = req.query;

      if (event_id) {
        // Stats for specific event
        const event = await models.Event.findByPk(event_id);
        if (!event) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
        }

        const stats = {
          id: event.id,
          title: event.title,
          views: event.views || 0,
          clicks: event.clicks || 0,
          ctr: event.views > 0 ? ((event.clicks / event.views) * 100).toFixed(2) + '%' : '0%',
          status: new Date(event.end_date) < new Date() ? 'ended' : 
                  new Date(event.start_date) > new Date() ? 'upcoming' : 'ongoing'
        };

        return res.json({ success: true, stats });
      }

      // Overall stats
      const where = {};
      if (start_date && end_date) {
        where.created_at = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      const totalEvents = await models.Event.count({ where });
      const activeEvents = await models.Event.count({ 
        where: { ...where, is_active: true } 
      });
      
      const totalViews = await models.Event.sum('views', { where }) || 0;
      const totalClicks = await models.Event.sum('clicks', { where }) || 0;

      const topEvents = await models.Event.findAll({
        where,
        order: [['views', 'DESC']],
        limit: 5,
        attributes: ['id', 'title', 'views', 'clicks', 'event_type']
      });

      const stats = {
        total_events: totalEvents,
        active_events: activeEvents,
        total_views: totalViews,
        total_clicks: totalClicks,
        avg_ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) + '%' : '0%',
        top_events: topEvents
      };

      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Duplicate event
  duplicateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const originalEvent = await models.Event.findByPk(id);
      
      if (!originalEvent) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
      }

      const eventData = originalEvent.toJSON();
      delete eventData.id;
      delete eventData.created_at;
      delete eventData.updated_at;

      // Reset stats
      eventData.views = 0;
      eventData.clicks = 0;
      eventData.is_active = false;

      // New title and slug
      eventData.title = `${eventData.title} (Copy)`;
      eventData.slug = eventData.slug + '-copy-' + Date.now();

      const duplicatedEvent = await models.Event.create(eventData);

      res.json({ success: true, event: duplicatedEvent });
    } catch (error) {
      console.error('Error duplicating event:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Export events to CSV
  exportEvents: async (req, res) => {
    try {
      const events = await models.Event.findAll({
        order: [['created_at', 'DESC']],
        raw: true
      });

      // Create CSV
      const csv = [
        ['ID', 'Tiêu đề', 'Loại', 'Ngày bắt đầu', 'Ngày kết thúc', 'Lượt xem', 'Lượt click', 'Trạng thái'].join(','),
        ...events.map(e => [
          e.id,
          `"${e.title}"`,
          e.event_type,
          new Date(e.start_date).toLocaleDateString('vi-VN'),
          new Date(e.end_date).toLocaleDateString('vi-VN'),
          e.views || 0,
          e.clicks || 0,
          e.is_active ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=events-${Date.now()}.csv`);
      res.send('\uFEFF' + csv); // UTF-8 BOM for Excel
    } catch (error) {
      console.error('Error exporting events:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
   // ✅ MỚI: Validate voucher khi thanh toán (dùng cho PaymentPage)
  validateVoucher: async (req, res) => {
    try {
      const userId = req.user.id;
      const { code, order_type, total_amount } = req.body;
      // order_type: 'service' | 'medicine' | 'consultation' | 'all'

      if (!code) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập mã voucher' });
      }

      // 1. Tìm voucher theo code
      const promotion = await models.Promotion.findOne({
        where: { 
          code: code.toUpperCase(),
          is_active: true,
          start_date: { [Op.lte]: new Date() },
          end_date: { [Op.gte]: new Date() }
        }
      });

      if (!promotion) {
        return res.status(404).json({ success: false, message: 'Mã không tồn tại hoặc đã hết hạn' });
      }

      // 2. Kiểm tra còn lượt dùng không
      if (promotion.usage_count >= promotion.usage_limit) {
        return res.status(400).json({ success: false, message: 'Mã voucher đã hết lượt sử dụng' });
      }

      // 3. Kiểm tra đúng loại dịch vụ không
      if (promotion.apply_for !== 'all' && promotion.apply_for !== order_type) {
        const typeMap = { service: 'dịch vụ khám', medicine: 'thuốc', consultation: 'tư vấn' };
        return res.status(400).json({ 
          success: false, 
          message: `Mã này chỉ áp dụng cho ${typeMap[promotion.apply_for] || promotion.apply_for}` 
        });
      }

      // 4. Kiểm tra đơn tối thiểu
      if (total_amount < promotion.min_order_value) {
        return res.status(400).json({ 
          success: false, 
          message: `Đơn hàng tối thiểu ${promotion.min_order_value.toLocaleString('vi-VN')}đ để dùng mã này` 
        });
      }

      if (promotion.apply_for !== 'all') {
        const applicableIds = promotion.applicable_ids ? promotion.applicable_ids.split(',') : [];
        // Nếu admin có chọn đích danh ID thì check, nếu không chọn thì mặc định áp dụng cho TẤT CẢ mục cùng loại
        if (applicableIds.length > 0 && !applicableIds.includes(req.body.item_id?.toString())) {
            return res.status(400).json({ 
                success: false, 
                message: `Mã này không áp dụng cho sản phẩm/dịch vụ bạn đang chọn.` 
            });
        }
      }

      // 5. Kiểm tra user đã THU THẬP mã này chưa và đã dùng chưa
      const userVoucher = await models.UserVoucher.findOne({
        where: { user_id: userId, promotion_id: promotion.id }
      });
      
      if (!userVoucher) {
        return res.status(400).json({ success: false, message: 'Bạn chưa lưu mã này vào Ví Voucher. Hãy ra Kho Ưu Đãi để lưu nhé!' });
      }
      if (userVoucher.is_used) {
        return res.status(400).json({ success: false, message: 'Bạn đã sử dụng mã voucher này rồi' });
      }

      // 6. Tính số tiền giảm
      let discountAmount = 0;
      if (promotion.discount_type === 'percentage') {
        discountAmount = (total_amount * promotion.discount_value) / 100;
        // Áp dụng giảm tối đa nếu có
        if (promotion.max_discount_amount && discountAmount > promotion.max_discount_amount) {
          discountAmount = promotion.max_discount_amount;
        }
      } else {
        discountAmount = promotion.discount_value;
      }
      if (discountAmount > total_amount) discountAmount = total_amount;

      res.json({
        success: true,
        message: `Áp dụng mã thành công! Giảm ${discountAmount.toLocaleString('vi-VN')}đ`,
        discount: {
          promotion_id: promotion.id,
          code: promotion.code,
          name: promotion.name,
          discount_amount: discountAmount,
          final_amount: total_amount - discountAmount
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // ✅ THÊM MỚI: API Lấy danh sách Dịch vụ / Thuốc / Tư vấn để chọn
  getSelectionData: async (req, res) => {
    try {
      const type = req.query.type; // 'service', 'medicine', 'consultation'
      let data = [];

      if (type === 'service') {
        data = await models.Service.findAll({
          where: { status: 'active' },
          attributes: ['id', 'name', 'price']
        });
      } else if (type === 'medicine') {
        data = await models.Medicine.findAll({
          where: { hidden: false },
          attributes: ['id', 'name', 'price']
        });
      } else if (type === 'consultation') {
        data = await models.ConsultationPricing.findAll({
          where: { is_active: true },
          attributes: ['id', ['package_name', 'name'], 'price'] // map tên trường cho đồng nhất Frontend
        });
      }

      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = marketingController;