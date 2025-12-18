// server/config/articlesSeed.js
// Hàm seed dữ liệu cho bảng Articles
module.exports = async function seedArticles(models, transaction, context = {}) {
  const tinTucCategory = context.tinTucCategory;
  const admins = context.admins;
  if (!tinTucCategory) throw new Error('articlesSeed requires tinTucCategory');
  if (!admins || admins.length === 0) throw new Error('articlesSeed requires admins');
  const sampleArticles = [
    { title: 'Cách phòng ngừa bệnh tim mạch', content: 'Nội dung bài viết về phòng ngừa tim mạch', slug: 'cach-phong-ngua-benh-tim-mach', meta_description: 'Hướng dẫn phòng ngừa', meta_keywords: 'tim mach, phong ngua' },
    { title: 'Dinh dưỡng cho người cao tuổi', content: 'Nội dung bài viết về dinh dưỡng', slug: 'dinh-duong-cho-nguoi-cao-tuoi', meta_description: 'Dinh dưỡng người cao tuổi', meta_keywords: 'dinh duong, cao tuoi' },
    { title: 'Tập luyện cho sức khỏe tim mạch', content: 'Bài viết về bài tập tốt cho tim', slug: 'tap-luyen-cho-tim-mach', meta_description: 'Tập luyện tim mạch', meta_keywords: 'tap luyen, tim mach' },
    { title: 'Phòng ngừa đột quỵ', content: 'Cách nhận biết và phòng ngừa đột quỵ', slug: 'phong-ngua-dot-quy', meta_description: 'Phòng ngừa đột quỵ', meta_keywords: 'dot quy, phong ngua' },
    { title: 'Chế độ ăn cho bệnh tiểu đường', content: 'Lời khuyên dinh dưỡng cho người tiểu đường', slug: 'che-do-an-tieu-duong', meta_description: 'Dinh dưỡng tiểu đường', meta_keywords: 'tieu duong, dinh duong' },
    { title: 'Mẹo bảo vệ sức khỏe hô hấp', content: 'Giữ gìn phổi và hô hấp', slug: 'bao-ve-suc-khoe-ho-hap', meta_description: 'Sức khỏe hô hấp', meta_keywords: 'ho hap, phong ngua' },
    { title: 'Dấu hiệu ung thư sớm', content: 'Những dấu hiệu cần khám sớm', slug: 'dau-hieu-ung-thu-som', meta_description: 'Ung thư', meta_keywords: 'ung thu, phat hien som' },
    { title: 'Lợi ích khám sức khỏe định kỳ', content: 'Tại sao cần khám định kỳ', slug: 'loi-ich-kham-dinh-ky', meta_description: 'Khám định kỳ', meta_keywords: 'kham suc khoe' },
    { title: 'Các loại vaccine cần thiết', content: 'Danh sách vaccine khuyến nghị', slug: 'cac-loai-vaccine-can-thiet', meta_description: 'Vaccine', meta_keywords: 'vaccine, tiem ngua' },
    { title: 'Tư vấn dinh dưỡng cho trẻ nhỏ', content: 'Hướng dẫn dinh dưỡng cho trẻ', slug: 'tu-van-dinh-duong-tre-nho', meta_description: 'Dinh dưỡng trẻ', meta_keywords: 'tre em, dinh duong' }
  ];

  const articlesToCreate = sampleArticles.map((a, idx) => ({
    category_id: tinTucCategory.id,
    title: a.title,
    content: a.content,
    author_id: admins[idx % admins.length].user_id,
    status: 'approved',
    slug: a.slug,
    meta_description: a.meta_description,
    meta_keywords: a.meta_keywords,
    created_at: new Date(),
    updated_at: new Date()
  }));

  const articles = await models.Article.bulkCreate(articlesToCreate, { transaction });
  return articles;
};