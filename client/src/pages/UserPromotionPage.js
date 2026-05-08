// client/src/pages/UserPromotionPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaTicketAlt, FaGamepad, FaStar, FaExchangeAlt, FaCalendarCheck,
  FaGift, FaCheckCircle, FaClock, FaTags, FaStoreAlt,
  FaTrophy, FaHistory, FaSpinner, FaExclamationCircle,
  FaBolt, FaArrowRight, FaTimes, FaWallet, FaFire,
  FaBoxOpen, FaConciergeBell, FaShippingFast, FaPills,
  FaPercent, FaMoneyBillWave, FaInfoCircle, FaRegCalendarAlt
} from 'react-icons/fa';
import './UserPromotionPage.css';

const APPLY_FOR_LABELS = {
  all:          'Tất cả hóa đơn',
  service:      'Dịch vụ khám bệnh',
  medicine:     'Đơn mua thuốc',
  consultation: 'Gói tư vấn',
  shipping:     'Phí vận chuyển',
};
const STORE_FILTERS = [
  { key: 'all',          label: 'Tất cả ưu đãi' },
  { key: 'service',      label: 'Dịch vụ Khám' },
  { key: 'medicine',     label: 'Hiệu Thuốc' },
  { key: 'consultation', label: 'Tư Vấn Online' },
  { key: 'shipping',     label: 'Miễn phí Ship' },
];
const WHEEL_COLORS = ['#16a34a','#d97706','#2563eb','#ea580c','#7c3aed','#db2777'];

const UserPromotionPage = ({ tab = 'vouchers' }) => {
  const [activeTab,             setActiveTab]             = useState(tab);
  const [voucherSubTab,         setVoucherSubTab]         = useState('public');
  const [gameSubTab,            setGameSubTab]            = useState('wheel');
  const [publicVouchers,        setPublicVouchers]        = useState([]);
  const [myVouchers,            setMyVouchers]            = useState([]);
  const [gameResult,            setGameResult]            = useState(null);
  const [isSpinning,            setIsSpinning]            = useState(false);
  const [userPoints,            setUserPoints]            = useState(0);
  const [loading,               setLoading]               = useState(false);
  const [selectedVoucherDetail, setSelectedVoucherDetail] = useState(null);
  const [winPopup,              setWinPopup]              = useState(null);
  const [storeFilter,           setStoreFilter]           = useState('all');
  const [wheelRewards,          setWheelRewards]          = useState([]);
  const [wheelRotation,         setWheelRotation]         = useState(0);

  const apiCall = async (method, url, data = null) => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const res = method === 'post' ? await axios.post(url, data, config) : await axios.get(url, config);
    return res.data;
  };

  const fetchPublicVouchers = async () => {
    setLoading(true);
    try { const d = await apiCall('get', 'http://localhost:3001/api/marketing/public-promotions'); if (d.success) setPublicVouchers(d.promotions); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const fetchMyVouchers = async () => {
    try { const d = await apiCall('get', 'http://localhost:3001/api/marketing/my-vouchers'); if (d.success) setMyVouchers(d.vouchers); }
    catch (e) { console.error(e); }
  };
  const fetchPoints = async () => {
    try { const d = await apiCall('get', 'http://localhost:3001/api/marketing/my-points'); if (d.success) setUserPoints(d.points); }
    catch (e) { console.error(e); }
  };
  const fetchWheelRewards = async () => {
    try {
      const d = await apiCall('get', 'http://localhost:3001/api/marketing/game/rewards');
      const items = d.rewards ? [...d.rewards, { id: 'miss', name: 'Mất lượt' }] : [{ id: 'miss', name: 'Mất lượt' }];
      setWheelRewards(items);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchPublicVouchers(); fetchMyVouchers(); fetchPoints(); fetchWheelRewards();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpin = async () => {
    if (userPoints < 10) { alert('Bạn không đủ điểm! Hãy điểm danh để nhận thêm 10 điểm.'); return; }
    setIsSpinning(true); setGameResult(null);
    try {
      const d = await apiCall('post', 'http://localhost:3001/api/marketing/game/play');
      fetchPoints();
      const sliceAngle = 360 / wheelRewards.length;
      let idx = wheelRewards.findIndex(r => String(r.id) === String(d.reward ? d.reward.id : 'miss'));
      if (idx === -1) idx = wheelRewards.findIndex(r => String(r.id) === 'miss');
      if (idx === -1) idx = wheelRewards.length - 1;
      const centerAngle = idx * sliceAngle + sliceAngle / 2;
      const target = 360 - centerAngle;
      setWheelRotation(prev => { const mod = prev % 360; let diff = target - mod; if (diff < 0) diff += 360; return prev + diff + 1800; });
      setTimeout(() => {
        setGameResult({ result: d.result, message: d.message });
        if (d.reward) { fetchMyVouchers(); setWinPopup(d.reward); }
        setIsSpinning(false);
      }, 4000);
    } catch (msg) { alert(msg); setIsSpinning(false); }
  };

  const handleCheckin = async () => {
    try { const d = await apiCall('post', 'http://localhost:3001/api/marketing/checkin'); if (d.success) { setUserPoints(d.points); alert(d.message); } }
    catch (msg) { alert(msg); }
  };

  const handleExchangePoints = async (promo, cost) => {
    if (userPoints < cost) { alert(`Bạn cần ${cost} điểm để đổi mã ${promo.name}!`); return; }
    if (!window.confirm(`Dùng ${cost} điểm để đổi lấy mã: ${promo.name}?`)) return;
    setLoading(true);
    try { const d = await apiCall('post', `http://localhost:3001/api/marketing/exchange-points/${promo.id}`); if (d.success) { alert(d.message); setUserPoints(d.points); fetchMyVouchers(); fetchPublicVouchers(); } }
    catch (msg) { alert(msg); } finally { setLoading(false); }
  };

  const handleClaimVoucher = async (promotionId) => {
    try { const d = await apiCall('post', 'http://localhost:3001/api/marketing/claim-voucher', { promotion_id: promotionId }); if (d.success) { alert(d.message); fetchPublicVouchers(); fetchMyVouchers(); } }
    catch (msg) { alert(msg); }
  };

  const handleUseVoucher = (voucher) => {
    if (voucher.apply_for === 'medicine') alert(`Mã: ${voucher.code}. Áp dụng cho danh sách thuốc hỗ trợ.`);
    else if (voucher.apply_for === 'service') window.location.href = `/dat-lich-hen?serviceIds=${voucher.applicable_ids || ''}&voucher=${voucher.code}`;
    else if (voucher.apply_for === 'consultation') window.location.href = `/dat-lich-tu-van?voucher=${voucher.code}`;
    else window.location.href = '/dich-vu';
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');
  const fmtDisc = (p) => p.discount_type === 'percentage' ? `Giảm ${p.discount_value}%` : `Giảm ${Number(p.discount_value).toLocaleString('vi-VN')}đ`;

  const wheelBg = wheelRewards.length > 0
    ? `conic-gradient(${wheelRewards.map((_, i) => { const s = 360 / wheelRewards.length; return `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * s}deg ${(i + 1) * s}deg`; }).join(', ')})`
    : '#ccc';

  const renderVoucherCard = (v, isMyVoucher) => {
    const promo = isMyVoucher ? v.Promotion : v;
    const isClaimed = !isMyVoucher && myVouchers.some(m => m.promotion_id === promo.id);
    const remaining = promo.usage_limit - promo.usage_count;
    const pct = (remaining / promo.usage_limit) * 100;
    const isHot = !isMyVoucher && pct <= 10 && remaining > 0;
    return (
      <div key={isMyVoucher ? v.id : promo.id} className="upp-voucher-card">
        {isHot && <div className="upp-ribbon">Sắp hết ({remaining})</div>}
        <div className="upp-voucher-card__topbar" />
        <div className="upp-voucher-card__body">
          <div className="upp-voucher-card__icon"><FaGift /></div>
          <div className="upp-voucher-card__name">{promo.name}</div>
          <div className="upp-voucher-card__code">{promo.code}</div>
          <div className="upp-voucher-card__expiry"><FaClock /> HSD: {fmtDate(promo.end_date)}</div>
          {!isMyVoucher && (
            <div className="upp-voucher-card__progress">
              <div className="upp-voucher-card__progress-label">
                <span>Đã phát: <b>{promo.usage_count}/{promo.usage_limit}</b></span>
                {isHot && <span style={{ color:'#dc2626', display:'flex', alignItems:'center', gap:3, fontWeight:700, fontSize:'0.7rem' }}><FaFire />HOT</span>}
              </div>
              <div className="upp-voucher-card__progress-bar">
                <div className={`upp-voucher-card__progress-fill ${isHot ? 'upp-voucher-card__progress-fill--hot' : 'upp-voucher-card__progress-fill--normal'}`} style={{ width: `${100 - pct}%` }} />
              </div>
            </div>
          )}
          <div className="upp-voucher-card__actions">
            <button className="upp-btn upp-btn--sm upp-btn--outline" onClick={() => setSelectedVoucherDetail(promo)}><FaInfoCircle /> Chi tiết</button>
            {isMyVoucher
              ? <button className="upp-btn upp-btn--sm upp-btn--primary" onClick={() => handleUseVoucher(v)}><FaArrowRight /> Dùng ngay</button>
              : <button className={`upp-btn upp-btn--sm ${isClaimed ? 'upp-btn--disabled' : 'upp-btn--orange'}`} onClick={() => !isClaimed && handleClaimVoucher(promo.id)} disabled={isClaimed}>
                  {isClaimed ? <><FaCheckCircle /> Đã lấy</> : <><FaTags /> Lưu mã</>}
                </button>
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="upp-page">

      {/* Marquee */}
      <div className="upp-marquee">
        <span className="upp-marquee__icon"><FaBolt /></span>
        <marquee className="upp-marquee__text" direction="left" scrollamount="6">
          Chúc mừng 098****123 vừa quay trúng Thẻ Viettel 50K! &nbsp;—&nbsp;
          Chúc mừng 090****456 vừa nhận Voucher Giảm 50%! &nbsp;—&nbsp;
          Chúc mừng 093****789 vừa trúng Gói khám miễn phí!
        </marquee>
      </div>

      {/* Header */}
      <div className="upp-header">
        <h2 className="upp-header__title">Thế Giới Ưu Đãi &amp; Quà Tặng</h2>
        <p className="upp-header__sub">Khám phá kho quà tặng và tham gia các hoạt động tích điểm thú vị!</p>
      </div>

      {/* Main tabs */}
      <div className="upp-tabs">
        <button className={`upp-tab ${activeTab === 'vouchers' ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('vouchers')}><FaTicketAlt /> Kho Voucher</button>
        <button className={`upp-tab ${activeTab === 'game'     ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('game')}><FaGamepad /> Vòng Quay</button>
        <button className={`upp-tab ${activeTab === 'loyalty'  ? 'upp-tab--active' : ''}`} onClick={() => setActiveTab('loyalty')}><FaStar /> Điểm Thưởng</button>
      </div>

      <div className="upp-content">

        {/* ── VOUCHERS ── */}
        {activeTab === 'vouchers' && (
          <>
            <div className="upp-subtab-nav">
              <button className={`upp-subtab ${voucherSubTab === 'public' ? 'upp-subtab--active' : ''}`} onClick={() => setVoucherSubTab('public')}><FaFire /> Kho Ưu Đãi</button>
              <button className={`upp-subtab ${voucherSubTab === 'my'     ? 'upp-subtab--active' : ''}`} onClick={() => setVoucherSubTab('my')}><FaWallet /> Ví Của Tôi ({myVouchers.filter(v => v.Promotion?.reward_type !== 'card').length})</button>
            </div>
            {loading
              ? <div className="upp-loading"><div className="upp-spinner" /><p>Đang tải...</p></div>
              : (() => {
                  const list = voucherSubTab === 'public' ? publicVouchers.filter(p => !p.is_exchange_reward) : myVouchers.filter(v => v.Promotion?.reward_type !== 'card');
                  return list.length === 0
                    ? <div className="upp-empty"><div className="upp-empty__icon"><FaBoxOpen /></div><div className="upp-empty__title">Không có voucher nào</div><div className="upp-empty__sub">Hãy quay lại sau nhé!</div></div>
                    : <div className="upp-voucher-grid">{list.map(v => renderVoucherCard(v, voucherSubTab === 'my'))}</div>;
                })()
            }
          </>
        )}

        {/* ── GAME ── */}
        {activeTab === 'game' && (
          <>
            <div className="upp-subtab-nav" style={{ justifyContent: 'center' }}>
              <button className={`upp-subtab ${gameSubTab === 'wheel'   ? 'upp-subtab--active' : ''}`} onClick={() => setGameSubTab('wheel')}><FaGamepad /> Quay Thưởng</button>
              <button className={`upp-subtab ${gameSubTab === 'history' ? 'upp-subtab--active' : ''}`} onClick={() => setGameSubTab('history')}><FaHistory /> Lịch Sử Trúng Thưởng</button>
            </div>

            {gameSubTab === 'wheel' && (
              <div className="upp-game-area">
                <div className="upp-game-content">
                  <div className="upp-wheel-pointer" />
                  <div className="upp-wheel-wrap" style={{ transform: `rotate(${wheelRotation}deg)`, background: wheelBg }}>
                    <div className="upp-wheel-center">SPIN</div>
                    {wheelRewards.map((r, i) => {
                      const step = 360 / wheelRewards.length;
                      return <div key={i} className="upp-wheel-text" style={{ transform: `rotate(${i * step + step / 2}deg) translate(0,-50%)` }}>{r.name.substring(0,15)}</div>;
                    })}
                  </div>
                  <h3 className="upp-game-title">Vòng Quay May Mắn</h3>
                  <p className="upp-game-sub">Sử dụng <b>10 Điểm</b> để quay &nbsp;|&nbsp; Điểm hiện tại: <b>{userPoints}</b></p>
                  <button className="upp-btn--spin" onClick={handleSpin} disabled={isSpinning}>
                    {isSpinning ? <><FaSpinner style={{ animation:'spin 0.9s linear infinite' }} /> Đang quay...</> : 'QUAY NGAY (10 ĐIỂM)'}
                  </button>
                  {gameResult && (
                    <div className={`upp-game-result upp-game-result--${gameResult.result}`}>
                      {gameResult.result === 'win' ? <FaCheckCircle /> : <FaExclamationCircle />}
                      <p>{gameResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {gameSubTab === 'history' && (
              myVouchers.filter(v => v.Promotion?.is_game_reward).length === 0
                ? <div className="upp-empty"><div className="upp-empty__icon"><FaTrophy /></div><div className="upp-empty__title">Chưa có phần thưởng nào</div><div className="upp-empty__sub">Hãy thử Vòng quay ngay!</div></div>
                : <div className="upp-history-list">
                    {myVouchers.filter(v => v.Promotion?.is_game_reward).map(v => (
                      <div key={v.id} className={`upp-history-card ${v.Promotion.reward_type === 'card' ? 'upp-history-card--card' : 'upp-history-card--voucher'}`}>
                        {v.Promotion.reward_image_url
                          ? <img src={v.Promotion.reward_image_url} alt="Quà" className="upp-history-card__img" />
                          : <div className="upp-history-card__icon-wrap"><FaGift /></div>
                        }
                        <div>
                          <span className="upp-history-card__name">{v.Promotion.name}</span>
                          <span className="upp-history-card__date"><FaRegCalendarAlt /> Trúng ngày: {fmtDate(v.created_at)}</span>
                          {v.Promotion.reward_type === 'card'
                            ? <span className="upp-history-card__code">Mã: {v.Promotion.external_code}</span>
                            : <span className="upp-history-card__saved"><FaCheckCircle /> Đã lưu vào Ví Voucher</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
            )}
          </>
        )}

        {/* ── LOYALTY ── */}
        {activeTab === 'loyalty' && (
          <>
            <div className="upp-checkin-box">
              <h2 className="upp-checkin-box__title">Điểm danh 7 Ngày</h2>
              <div className="upp-checkin-box__points"><FaStar /> {userPoints} Điểm</div>
              <button className="upp-btn upp-btn--md upp-btn--primary" onClick={handleCheckin} disabled={loading}>
                <FaCalendarCheck /> Điểm danh hôm nay (+10đ)
              </button>
              <div className="upp-checkin-row">
                {[1,2,3,4,5,6,7].map(day => {
                  const done = day <= 3;
                  return (
                    <div key={day} className="upp-checkin-item">
                      <div className={`upp-checkin-circle ${done ? 'upp-checkin-circle--done' : ''}`}>
                        {done ? <FaCheckCircle /> : `+10`}
                      </div>
                      <span className="upp-checkin-label">Ngày {day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <h2 className="upp-store-title"><FaExchangeAlt /> Cửa hàng Đổi Thưởng</h2>
            <div className="upp-store-filters">
              {STORE_FILTERS.map(f => (
                <button key={f.key} className={`upp-store-filter ${storeFilter === f.key ? 'upp-store-filter--active' : ''}`} onClick={() => setStoreFilter(f.key)}>{f.label}</button>
              ))}
            </div>
            <div className="upp-store-grid">
              {publicVouchers
                .filter(p => p.is_exchange_reward)
                .filter(p => storeFilter === 'all' || p.apply_for === storeFilter)
                .map(promo => {
                  const cost = promo.exchange_points || 50;
                  const canAfford = userPoints >= cost;
                  return (
                    <div key={promo.id} className="upp-store-card">
                      <div className="upp-store-card__cost"><FaStar /> {cost} Điểm</div>
                      <div className="upp-store-card__name">{promo.name}</div>
                      <div className="upp-store-card__discount">{fmtDisc(promo)}</div>
                      <p className="upp-store-card__meta"><b>Áp dụng:</b> {APPLY_FOR_LABELS[promo.apply_for] || promo.apply_for}<br /><b>HSD:</b> {fmtDate(promo.end_date)}</p>
                      <button className={`upp-btn upp-btn--full ${canAfford ? 'upp-btn--primary' : 'upp-btn--disabled'}`} onClick={() => canAfford && handleExchangePoints(promo, cost)} disabled={!canAfford}>
                        {canAfford ? <><FaExchangeAlt /> Đổi Điểm Ngay</> : <><FaExclamationCircle /> Thiếu {cost - userPoints} Điểm</>}
                      </button>
                    </div>
                  );
                })}
            </div>
            {publicVouchers.filter(p => p.is_exchange_reward && (storeFilter === 'all' || p.apply_for === storeFilter)).length === 0 && (
              <div className="upp-empty"><div className="upp-empty__icon"><FaStoreAlt /></div><div className="upp-empty__title">Chưa có voucher trong danh mục này</div></div>
            )}
          </>
        )}

      </div>

      {/* WIN POPUP */}
      {winPopup && (
        <div className="upp-modal-overlay" onClick={() => setWinPopup(null)}>
          <div className="upp-modal upp-win-modal" onClick={e => e.stopPropagation()}>
            <div className="upp-win-modal__header">
              <div className="upp-win-modal__header-icon"><FaTrophy /></div>
              <h2 className="upp-win-modal__title">Bạn Đã Trúng!</h2>
            </div>
            <div className="upp-win-modal__body">
              {winPopup.reward_image_url
                ? <img src={winPopup.reward_image_url} alt="Quà" className="upp-win-modal__reward-img" />
                : <div className="upp-win-modal__reward-icon"><FaGift /></div>
              }
              <p className="upp-win-modal__name">{winPopup.name}</p>
              <div className="upp-win-modal__code-box">
                <div className="upp-win-modal__confetti upp-win-modal__confetti--left"><FaStar /></div>
                <div className="upp-win-modal__confetti upp-win-modal__confetti--right"><FaStar /></div>
                <p className="upp-win-modal__code-label">{winPopup.reward_type === 'card' ? 'Mã nạp thẻ / Số PIN:' : 'Mã Code Voucher của bạn:'}</p>
                <p className="upp-win-modal__code-value">{winPopup.reward_type === 'card' ? winPopup.external_code : winPopup.code}</p>
              </div>
              <p className="upp-win-modal__note">Phần thưởng đã được tự động lưu vào Ví / Lịch sử của bạn.</p>
              <button className="upp-btn upp-btn--full upp-btn--primary" onClick={() => setWinPopup(null)}><FaCheckCircle /> Tuyệt vời!</button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER DETAIL MODAL */}
      {selectedVoucherDetail && (
        <div className="upp-modal-overlay" onClick={() => setSelectedVoucherDetail(null)}>
          <div className="upp-modal" onClick={e => e.stopPropagation()}>
            <div className="upp-detail-modal__header">
              <h3 className="upp-detail-modal__title">Chi tiết ưu đãi</h3>
              <button className="upp-detail-modal__close" onClick={() => setSelectedVoucherDetail(null)}><FaTimes /></button>
            </div>
            <div className="upp-detail-modal__body">
              <p className="upp-detail-modal__name">{selectedVoucherDetail.name}</p>
              <div className="upp-detail-modal__code-box">
                <p className="upp-detail-modal__code-label">Mã Voucher</p>
                <p className="upp-detail-modal__code-value">{selectedVoucherDetail.code}</p>
              </div>
              <div className="upp-detail-modal__info">
                <div className="upp-detail-modal__info-row">
                  <FaPercent />
                  <span><b>Mức giảm: </b>{selectedVoucherDetail.discount_type === 'percentage' ? `${selectedVoucherDetail.discount_value}%` : `${Number(selectedVoucherDetail.discount_value).toLocaleString('vi-VN')} VNĐ`}</span>
                </div>
                <div className="upp-detail-modal__info-row">
                  <FaTags />
                  <span><b>Áp dụng: </b>{APPLY_FOR_LABELS[selectedVoucherDetail.apply_for] || selectedVoucherDetail.apply_for}</span>
                </div>
                {selectedVoucherDetail.min_order_value > 0 && (
                  <div className="upp-detail-modal__info-row"><FaMoneyBillWave /><span><b>Đơn tối thiểu: </b>{Number(selectedVoucherDetail.min_order_value).toLocaleString('vi-VN')} VNĐ</span></div>
                )}
                {selectedVoucherDetail.max_discount_amount > 0 && (
                  <div className="upp-detail-modal__info-row"><FaMoneyBillWave /><span><b>Giảm tối đa: </b>{Number(selectedVoucherDetail.max_discount_amount).toLocaleString('vi-VN')} VNĐ</span></div>
                )}
                <div className="upp-detail-modal__info-row"><FaClock /><span><b>Hạn sử dụng: </b>{fmtDate(selectedVoucherDetail.end_date)}</span></div>
                <div className="upp-detail-modal__desc"><b>Mô tả: </b>{selectedVoucherDetail.description || 'Chưa có thông tin mô tả chi tiết.'}</div>
              </div>
              <button className="upp-btn upp-btn--full upp-btn--primary" style={{ marginTop: 18 }} onClick={() => { setSelectedVoucherDetail(null); handleUseVoucher(selectedVoucherDetail); }}>
                <FaArrowRight /> Sử dụng ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserPromotionPage;