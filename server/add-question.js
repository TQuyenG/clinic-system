require('dotenv').config({ path: '../.env' });

const { sequelize, models } = require('./config/db');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const [key, ...rest] = part.replace(/^--/, '').split('=');
      if (rest.length > 0) {
        args[key] = rest.join('=');
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          args[key] = next;
          i++;
        } else {
          args[key] = true;
        }
      }
    }
  }
  return args;
}

async function main() {
  try {
    const argv = parseArgs(process.argv);
    const title = argv.title || argv.t;
    const content = argv.content || argv.c;
    const authorEmail = argv.author || argv.user || 'patient1@gmail.com';
    const specialtySlug = argv.specialty || argv.spec || null;
    const tagsCsv = argv.tags || '';
    const status = argv.status || 'closed'; // closed to show in public list

    if (!title || !content) {
      console.error('Usage: node add-question.js --title "..." --content "..." [--author user@email] [--specialty slug] [--tags tag1,tag2] [--status open|closed|hidden]');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công');

    const { User, Specialty, Question } = models;

    const author = await User.findOne({ where: { email: authorEmail } });
    if (!author) {
      throw new Error(`Không tìm thấy user với email: ${authorEmail}. Hãy chạy seed-forum-data.js trước.`);
    }

    let specialtyId = null;
    if (specialtySlug) {
      const spec = await Specialty.findOne({ where: { slug: specialtySlug } });
      if (!spec) {
        throw new Error(`Không tìm thấy chuyên khoa với slug: ${specialtySlug}`);
      }
      specialtyId = spec.id;
    }

    const tags = tagsCsv
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const question = await Question.create({
      title,
      content,
      authorId: author.id,
      specialtyId,
      tags,
      status,
      viewsCount: 0,
      answersCount: 0,
      likesCount: 0,
      isAnonymous: false,
      isPinned: false,
    });

    console.log('✅ Đã tạo câu hỏi:', {
      id: question.id,
      title: question.title,
      status: question.status,
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi thêm câu hỏi:', err.message);
    process.exit(1);
  }
}

main();


