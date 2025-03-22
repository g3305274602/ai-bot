import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '.env.local' });

async function main() {
  try {
    console.log('开始初始化数据库...');

    // 读取 schema.sql 文件
    const schemaPath = path.join(process.cwd(), 'src', 'app', 'api', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 执行 SQL 语句
    await sql.query(schema);

    console.log('数据库初始化成功！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

main(); 