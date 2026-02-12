import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Blog Controller
 * Advanced blog management with SEO, reading time, social media integration
 */

const calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  return {
    minutes: readingTime,
    words: wordCount,
    text: readingTime === 1 ? '1 dakikalık okuma' : `${readingTime} dakikalık okuma`
  };
};

const generateSlug = (title) => {
  const turkishMap = {
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
    'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c'
  };

  return title
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const extractExcerpt = (content, maxLength = 160) => {
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
};

/**
 * Get all blog posts
 * @route GET /api/v1/blog
 */
export const getAllBlogPosts = async (req, res) => {
  const {
    status,
    category,
    tag,
    author_id,
    search,
    limit = 20,
    offset = 0,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  let posts = await db.getByPrefix('blogPosts:');

  // Public only sees published
  if (!req.user) {
    posts = posts.filter(p => p.status === 'published');
  } else if (status && status !== 'all') {
    posts = posts.filter(p => p.status === status);
  }

  if (category) posts = posts.filter(p => p.category === category);
  if (tag) posts = posts.filter(p => p.tags && p.tags.includes(tag));
  if (author_id) posts = posts.filter(p => p.author_id === author_id);

  if (search) {
    const searchLower = search.toLowerCase();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(searchLower) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(searchLower)) ||
      (p.content && p.content.toLowerCase().includes(searchLower))
    );
  }

  posts.sort((a, b) => {
    const aVal = a[sort] || '';
    const bVal = b[sort] || '';
    return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const total = posts.length;
  const page = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
  const paginatedPosts = posts.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  return sendPaginated(res, paginatedPosts, total, page, parseInt(limit));
};

/**
 * Get single blog post by slug
 * @route GET /api/v1/blog/:slug
 */
export const getBlogPostBySlug = async (req, res) => {
  const post = await db.get(`blogSlugs:${req.params.slug}`);

  if (!post || (!req.user && post.status !== 'published')) {
    throw new NotFoundError('Blog yazısı bulunamadı');
  }

  // Track view
  await db.set(`blogViews:${uuidv4()}`, {
    blog_id: post.id,
    slug: post.slug,
    viewed_at: new Date().toISOString(),
    ip: req.ip,
    user_agent: req.headers['user-agent']
  });

  post.views = (post.views || 0) + 1;
  await db.set(`blogPosts:${post.id}`, post);
  await db.set(`blogSlugs:${post.slug}`, post);

  return sendSuccess(res, { post });
};

/**
 * Create new blog post
 * @route POST /api/v1/blog
 */
export const createBlogPost = async (req, res) => {
  const {
    title, content, excerpt, category, tags,
    featured_image, status = 'draft', publish_date,
    meta_title, meta_description, meta_keywords,
    og_image, is_featured = false, allow_comments = true,
    social_media
  } = req.body;

  const slug = generateSlug(title);

  const existingPost = await db.get(`blogSlugs:${slug}`);
  if (existingPost) {
    throw new ConflictError('Bu başlıkla bir yazı zaten mevcut');
  }

  const readingTime = calculateReadingTime(content);
  const finalExcerpt = excerpt || extractExcerpt(content);
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  const post = {
    id,
    title: title.trim(),
    slug,
    content,
    excerpt: finalExcerpt,
    category: category || 'Genel',
    tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
    featured_image: featured_image || '',
    meta_title: meta_title || title,
    meta_description: meta_description || finalExcerpt,
    meta_keywords: meta_keywords || [],
    og_image: og_image || featured_image || '',
    canonical_url: `/blog/${slug}`,
    reading_time: readingTime,
    status,
    publish_date: status === 'published' ? (publish_date || timestamp) : publish_date,
    scheduled_date: status === 'scheduled' ? publish_date : null,
    social_media: social_media || {
      linkedin: { posted: false, post_id: null, posted_at: null, custom_message: '' },
      instagram: { posted: false, post_id: null, posted_at: null, custom_message: '' },
      twitter: { posted: false, post_id: null, posted_at: null, custom_message: '' }
    },
    author_id: req.user.id,
    author_name: req.user.name,
    created_at: timestamp,
    updated_at: timestamp,
    views: 0,
    is_featured,
    allow_comments,
    version: 1,
    previous_versions: []
  };

  await db.set(`blogPosts:${id}`, post);
  await db.set(`blogSlugs:${slug}`, post);

  logger.info(`Blog post created: ${title} [${id}]`);

  return sendCreated(res, { post, message: 'Blog yazısı başarıyla oluşturuldu' });
};

/**
 * Update blog post
 * @route PUT /api/v1/blog/:id
 */
export const updateBlogPost = async (req, res) => {
  const existingPost = await db.get(`blogPosts:${req.params.id}`);

  if (!existingPost) {
    throw new NotFoundError('Blog yazısı bulunamadı');
  }

  const updates = req.body;
  let newSlug = existingPost.slug;

  if (updates.title && updates.title !== existingPost.title) {
    newSlug = generateSlug(updates.title);
    const slugExists = await db.get(`blogSlugs:${newSlug}`);
    if (slugExists && slugExists.id !== existingPost.id) {
      newSlug = `${newSlug}-${Date.now()}`;
    }
    await db.del(`blogSlugs:${existingPost.slug}`);
  }

  let readingTime = existingPost.reading_time;
  if (updates.content) {
    readingTime = calculateReadingTime(updates.content);
  }

  if (updates.content && !updates.excerpt) {
    updates.excerpt = extractExcerpt(updates.content);
  }

  const previousVersions = existingPost.previous_versions || [];
  const { previous_versions: _, ...postDataForHistory } = existingPost;
  previousVersions.push({
    version: existingPost.version,
    data: postDataForHistory,
    updated_by: req.user.id,
    updated_at: new Date().toISOString()
  });

  const updatedPost = {
    ...existingPost,
    ...updates,
    slug: newSlug,
    reading_time: readingTime,
    updated_at: new Date().toISOString(),
    version: existingPost.version + 1,
    previous_versions: previousVersions.slice(-5)
  };

  if (updates.status === 'published' && !existingPost.publish_date) {
    updatedPost.publish_date = new Date().toISOString();
  }

  await db.set(`blogPosts:${req.params.id}`, updatedPost);
  await db.set(`blogSlugs:${newSlug}`, updatedPost);

  logger.info(`Blog post updated: ${updatedPost.title} [${req.params.id}]`);

  return sendSuccess(res, { post: updatedPost, message: 'Blog yazısı güncellendi' });
};

/**
 * Delete blog post
 * @route DELETE /api/v1/blog/:id
 */
export const deleteBlogPost = async (req, res) => {
  const post = await db.get(`blogPosts:${req.params.id}`);

  if (!post) {
    throw new NotFoundError('Blog yazısı bulunamadı');
  }

  await db.del(`blogPosts:${req.params.id}`);
  await db.del(`blogSlugs:${post.slug}`);

  logger.info(`Blog post deleted: ${post.title} [${post.id}]`);

  return sendSuccess(res, { message: 'Blog yazısı silindi' });
};

/**
 * Get blog categories
 * @route GET /api/v1/blog/categories
 */
export const getBlogCategories = async (req, res) => {
  const posts = await db.getByPrefix('blogPosts:');

  const categoryCounts = {};
  posts
    .filter(p => p.status === 'published')
    .forEach(post => {
      const cat = post.category || 'Genel';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count,
    slug: generateSlug(name)
  }));

  return sendSuccess(res, { categories });
};

/**
 * Get blog statistics
 * @route GET /api/v1/blog/stats
 */
export const getBlogStats = async (req, res) => {
  const posts = await db.getByPrefix('blogPosts:');
  const views = await db.getByPrefix('blogViews:');

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    draft: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    totalViews: views.length,
    viewsLast7Days: views.filter(v => new Date(v.viewed_at) > last7Days).length,
    viewsLast30Days: views.filter(v => new Date(v.viewed_at) > last30Days).length,
    avgReadingTime: posts.length > 0
      ? posts.reduce((sum, p) => sum + (p.reading_time?.minutes || 0), 0) / posts.length
      : 0,
    topPosts: posts
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10)
      .map(p => ({ id: p.id, title: p.title, slug: p.slug, views: p.views || 0, category: p.category })),
  };

  return sendSuccess(res, stats);
};
