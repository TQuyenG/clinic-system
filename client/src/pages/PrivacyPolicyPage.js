import React from 'react';
import { FaLock, FaShieldAlt, FaUserShield, FaDatabase, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './PrivacyPolicyPage.css';

const PrivacyPolicyPage = () => {
  const privacySections = [
    {
      icon: <FaDatabase />,
      title: 'Thông tin chúng tôi thu thập',
      items: [
        {
          subtitle: 'Thông tin cá nhân',
          content: 'Họ và tên, ngày tháng năm sinh, giới tính, số CMND/CCCD, địa chỉ, số điện thoại, email, ảnh đại diện'
        },
        {
          subtitle: 'Thông tin y tế',
          content: 'Tiền sử bệnh, dị ứng, thuốc đang sử dụng, triệu chứng, chẩn đoán, kết quả xét nghiệm, đơn thuốc, hình ảnh y học'
        },
        {
          subtitle: 'Thông tin thanh toán',
          content: 'Số thẻ tín dụng (mã hóa), thông tin giao dịch, lịch sử thanh toán'
        },
        {
          subtitle: 'Thông tin kỹ thuật',
          content: 'Địa chỉ IP, loại trình duyệt, hệ điều hành, thời gian truy cập, trang đã xem, cookie'
        }
      ]
    },
    {
      icon: <FaCheckCircle />,
      title: 'Cách chúng tôi sử dụng thông tin',
      items: [
        {
          subtitle: 'Cung cấp dịch vụ y tế',
          content: 'Quản lý lịch hẹn, lưu trữ hồ sơ bệnh án, hỗ trợ bác sĩ chẩn đoán và điều trị'
        },
        {
          subtitle: 'Liên lạc',
          content: 'Gửi xác nhận lịch hẹn, nhắc lịch khám, thông báo kết quả xét nghiệm, tư vấn sức khỏe'
        },
        {
          subtitle: 'Cải thiện dịch vụ',
          content: 'Phân tích hành vi người dùng, nghiên cứu và phát triển sản phẩm mới'
        },
        {
          subtitle: 'Bảo mật và phòng chống gian lận',
          content: 'Xác thực danh tính, phát hiện và ngăn chặn các hoạt động bất hợp pháp'
        },
        {
          subtitle: 'Tuân thủ pháp luật',
          content: 'Đáp ứng yêu cầu của cơ quan nhà nước, giải quyết tranh chấp pháp lý'
        }
      ]
    },
    {
      icon: <FaShieldAlt />,
      title: 'Biện pháp bảo mật',
      items: [
        {
          subtitle: 'Mã hóa dữ liệu',
          content: 'Sử dụng SSL/TLS 256-bit để mã hóa dữ liệu truyền tải. Dữ liệu nhạy cảm được mã hóa AES-256 khi lưu trữ'
        },
        {
          subtitle: 'Kiểm soát truy cập',
          content: 'Phân quyền nghiêm ngặt theo vai trò. Chỉ nhân viên có thẩm quyền mới được truy cập thông tin cần thiết'
        },
        {
          subtitle: 'Hệ thống bảo mật',
          content: 'Firewall, hệ thống phát hiện xâm nhập (IDS), phần mềm diệt virus, cập nhật bảo mật định kỳ'
        },
        {
          subtitle: 'Sao lưu dữ liệu',
          content: 'Sao lưu tự động hàng ngày, lưu trữ tại nhiều địa điểm, có khả năng khôi phục khi cần'
        },
        {
          subtitle: 'Đào tạo nhân viên',
          content: 'Tất cả nhân viên được đào tạo về bảo mật thông tin và cam kết bảo mật'
        },
        {
          subtitle: 'Kiểm toán bảo mật',
          content: 'Kiểm tra và đánh giá hệ thống bảo mật định kỳ bởi đơn vị độc lập'
        }
      ]
    },
    {
      icon: <FaUserShield />,
      title: 'Chia sẻ thông tin',
      items: [
        {
          subtitle: 'Với đội ngũ y tế',
          content: 'Bác sĩ, điều dưỡng, nhân viên y tế trực tiếp tham gia điều trị cho bạn'
        },
        {
          subtitle: 'Với đối tác dịch vụ',
          content: 'Công ty xử lý thanh toán, dịch vụ giao thuốc, phòng xét nghiệm bên ngoài (chỉ thông tin cần thiết)'
        },
        {
          subtitle: 'Với công ty bảo hiểm',
          content: 'Khi bạn sử dụng bảo hiểm y tế để thanh toán (theo yêu cầu của bạn)'
        },
        {
          subtitle: 'Với cơ quan nhà nước',
          content: 'Khi có yêu cầu hợp pháp từ tòa án, công an, hoặc cơ quan y tế'
        },
        {
          subtitle: 'Trong trường hợp khẩn cấp',
          content: 'Để bảo vệ sức khỏe, tính mạng của bạn hoặc người khác'
        }
      ]
    },
    {
      icon: <FaLock />,
      title: 'Quyền của bạn',
      items: [
        {
          subtitle: 'Quyền truy cập',
          content: 'Xem, tải xuống thông tin cá nhân và hồ sơ y tế của bạn bất kỳ lúc nào'
        },
        {
          subtitle: 'Quyền chỉnh sửa',
          content: 'Yêu cầu sửa đổi thông tin không chính xác hoặc lỗi thời'
        },
        {
          subtitle: 'Quyền xóa',
          content: 'Yêu cầu xóa dữ liệu cá nhân (trừ thông tin y tế phải lưu trữ theo pháp luật)'
        },
        {
          subtitle: 'Quyền từ chối',
          content: 'Từ chối nhận email marketing, SMS quảng cáo (vẫn nhận thông báo y tế quan trọng)'
        },
        {
          subtitle: 'Quyền khiếu nại',
          content: 'Khiếu nại với cơ quan bảo vệ dữ liệu nếu cho rằng quyền của bạn bị vi phạm'
        },
        {
          subtitle: 'Quyền rút lại đồng ý',
          content: 'Rút lại sự đồng ý sử dụng dữ liệu bất kỳ lúc nào'
        }
      ]
    },
    {
      icon: <FaExclamationTriangle />,
      title: 'Lưu trữ và xóa dữ liệu',
      items: [
        {
          subtitle: 'Thời gian lưu trữ',
          content: 'Hồ sơ y tế: Tối thiểu 15 năm theo quy định pháp luật. Thông tin tài khoản: Đến khi bạn yêu cầu xóa. Dữ liệu kỹ thuật: 2 năm'
        },
        {
          subtitle: 'Xóa tài khoản',
          content: 'Bạn có thể yêu cầu xóa tài khoản bất kỳ lúc nào. Hồ sơ y tế vẫn được lưu theo quy định. Xử lý trong vòng 30 ngày'
        },
        {
          subtitle: 'Dữ liệu còn lại',
          content: 'Một số dữ liệu vẫn được giữ lại để: Tuân thủ nghĩa vụ pháp lý, giải quyết tranh chấp, ngăn chặn gian lận'
        }
      ]
    }
  ];

  const cookieInfo = {
    title: 'Chính sách Cookie',
    description: 'Chúng tôi sử dụng cookie để cải thiện trải nghiệm người dùng',
    types: [
      {
        name: 'Cookie cần thiết',
        desc: 'Cần thiết cho hoạt động của website (đăng nhập, giỏ hàng)',
        canDisable: false
      },
      {
        name: 'Cookie phân tích',
        desc: 'Giúp chúng tôi hiểu cách người dùng sử dụng website',
        canDisable: true
      },
      {
        name: 'Cookie quảng cáo',
        desc: 'Hiển thị quảng cáo phù hợp với sở thích của bạn',
        canDisable: true
      }
    ]
  };

  return (
    <div className="privacy-policy-page">
      {/* Hero */}
      <section className="privacy-hero">
        <div className="container">
          <FaLock className="hero-icon" />
          <h1>Chính sách bảo mật</h1>
          <p className="hero-subtitle">
            Chúng tôi cam kết bảo vệ quyền riêng tư và bảo mật thông tin cá nhân của bạn
          </p>
          <p className="last-updated">Cập nhật lần cuối: 06/10/2025</p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="trust-badges">
        <div className="container">
          <div className="badges-grid">
            <div className="badge">
              <FaShieldAlt />
              <span>Mã hóa SSL</span>
            </div>
            <div className="badge">
              <FaLock />
              <span>Bảo mật 256-bit</span>
            </div>
            <div className="badge">
              <FaUserShield />
              <span>Tuân thủ GDPR</span>
            </div>
            <div className="badge">
              <FaCheckCircle />
              <span>ISO 27001</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="privacy-content">
        <div className="container">
          {privacySections.map((section, index) => (
            <div key={index} className="privacy-section">
              <div className="section-header">
                {section.icon}
                <h2>{section.title}</h2>
              </div>
              <div className="section-items">
                {section.items.map((item, idx) => (
                  <div key={idx} className="privacy-item">
                    <h3>{item.subtitle}</h3>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Cookie Section */}
          <div className="privacy-section cookie-section">
            <div className="section-header">
              <FaDatabase />
              <h2>{cookieInfo.title}</h2>
            </div>
            <p className="cookie-desc">{cookieInfo.description}</p>
            <div className="cookie-types">
              {cookieInfo.types.map((type, idx) => (
                <div key={idx} className="cookie-type">
                  <div className="cookie-header">
                    <h3>{type.name}</h3>
                    {type.canDisable ? (
                      <span className="optional-badge">Tùy chọn</span>
                    ) : (
                      <span className="required-badge">Bắt buộc</span>
                    )}
                  </div>
                  <p>{type.desc}</p>
                </div>
              ))}
            </div>
            <button className="btn-manage-cookies">Quản lý Cookie</button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="privacy-contact">
        <div className="container">
          <div className="contact-box">
            <h2>Câu hỏi về quyền riêng tư?</h2>
            <p>Liên hệ Bộ phận bảo mật dữ liệu của chúng tôi</p>
            <div className="contact-info">
              <div className="contact-item">
                <strong>Email:</strong> privacy@clinic.vn
              </div>
              <div className="contact-item">
                <strong>Điện thoại:</strong> (028) 3822 1234
              </div>
              <div className="contact-item">
                <strong>Địa chỉ:</strong> 123 Nguyễn Huệ, Quận 1, TP.HCM
              </div>
            </div>
            <button className="btn-contact">Gửi yêu cầu</button>
          </div>
        </div>
      </section>

      {/* Updates Notice */}
      <section className="privacy-updates">
        <div className="container">
          <div className="updates-box">
            <FaExclamationTriangle />
            <h3>Thông báo về cập nhật</h3>
            <p>
              Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian. 
              Chúng tôi sẽ thông báo cho bạn về các thay đổi quan trọng qua email 
              hoặc thông báo trên website. Vui lòng xem lại chính sách định kỳ.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;