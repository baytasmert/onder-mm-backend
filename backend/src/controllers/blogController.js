import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Blog Controller
 * Advanced blog management with SEO, reading time, social media integration
 */

/**
 * Calculate reading time for blog content
 * Average reading speed: 200 words per minute
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

/**
 * Generate slug from title (Turkish character support)
 */
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

/**
 * Extract excerpt from content if not provided
 */
const extractExcerpt = (content, maxLength = 160) => {
  const plainText = content.replace(/<[^>]*>/g, '').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
};

/**
 * Get all blog posts
 * @route GET /api/blog
 * @access Public
 */
export const getAllBlogPosts = async (req, res) => {
  try {
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

    // Filter by status (public only sees published)
    if (!req.user) {
      posts = posts.filter(p => p.status === 'published');
    } else if (status) {
      posts = posts.filter(p => p.status === status);
    }

    // Filter by category
    if (category) {
      posts = posts.filter(p => p.category === category);
    }

    // Filter by tag
    if (tag) {
      posts = posts.filter(p => p.tags && p.tags.includes(tag));
    }

    // Filter by author
    if (author_id) {
      posts = posts.filter(p => p.author_id === author_id);
    }

    // Search functionality
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        (p.excerpt && p.excerpt.toLowerCase().includes(searchLower)) ||
        (p.content && p.content.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    posts.sort((a, b) => {
      const aVal = a[sort] || '';
      const bVal = b[sort] || '';

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Pagination
    const total = posts.length;
    const paginatedPosts = posts.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      posts: paginatedPosts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total,
        page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ error: 'Blog yazıları getirilemedi' });
  }
};

/**
 * Get single blog post by slug
 * @route GET /api/blog/:slug
 * @access Public
 */
export const getBlogPostBySlug = async (req, res) => {
  try {
    const post = await db.get(`blogSlugs:${req.params.slug}`);

    if (!post) {
      return res.status(404).json({ error: 'Blog yazısı bulunamadı' });
    }

    // Public can only see published posts
    if (!req.user && post.status !== 'published') {
      return res.status(404).json({ error: 'Blog yazısı bulunamadı' });
    }

    // Track view (analytics)
    const viewId = uuidv4();
    await db.set(`blogViews:${viewId}`, {
      blog_id: post.id,
      slug: post.slug,
      viewed_at: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Increment view count
    post.views = (post.views || 0) + 1;
    await db.set(`blogPosts:${post.id}`, post);
    await db.set(`blogSlugs:${post.slug}`, post);

    res.json({ post });

  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Blog yazısı getirilemedi' });
  }
};

/**
 * Create new blog post
 * @route POST /api/blog
 * @access Protected (Admin)
 */
export const createBlogPost = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      category,
      tags,
      featured_image,
      status = 'draft',
      publish_date,
      meta_title,
      meta_description,
      meta_keywords,
      og_image,
      is_featured = false,
      allow_comments = true,
      social_media
    } = req.body;

    console.log('\n══════════════════════════════════════════════════');
    console.log('📝 [BLOG] Creating new blog post');
    console.log('══════════════════════════════════════════════════');
    console.log('📰 Title:', title);
    console.log('📂 Category:', category);
    console.log('🏷️  Tags:', tags);
    console.log('📊 Status:', status);
    console.log('══════════════════════════════════════════════════\n');

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        error: 'Başlık ve içerik zorunludur'
      });
    }

    // Generate slug
    const slug = generateSlug(title);

    // Check if slug exists
    const existingPost = await db.get(`blogSlugs:${slug}`);
    if (existingPost) {
      return res.status(409).json({
        error: 'Bu başlıkla bir yazı zaten mevcut',
        suggestion: `${slug}-${Date.now()}`
      });
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    // Auto-generate excerpt if not provided
    const finalExcerpt = excerpt || extractExcerpt(content);

    // Create blog post
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const post = {
      id,
      title: title.trim(),
      slug,
      content,
      excerpt: finalExcerpt,
      category: category || 'Genel',
      tags: tags || [],

      // Media
      featured_image: featured_image || '',

      // SEO
      meta_title: meta_title || title,
      meta_description: meta_description || finalExcerpt,
      meta_keywords: meta_keywords || tags || [],
      og_image: og_image || featured_image || '',
      canonical_url: `/blog/${slug}`,

      // Reading info
      reading_time: readingTime,

      // Status & Publishing
      status,
      publish_date: status === 'published' ? (publish_date || timestamp) : publish_date,
      scheduled_date: status === 'scheduled' ? publish_date : null,

      // Social Media
      social_media: social_media || {
        linkedin: {
          posted: false,
          post_id: null,
          posted_at: null,
          custom_message: ''
        },
        instagram: {
          posted: false,
          post_id: null,
          posted_at: null,
          custom_message: ''
        },
        twitter: {
          posted: false,
          post_id: null,
          posted_at: null,
          custom_message: ''
        }
      },

      // Author & Timestamps
      author_id: req.user.id,
      author_name: req.user.name,
      created_at: timestamp,
      updated_at: timestamp,

      // Engagement
      views: 0,
      is_featured,
      allow_comments,

      // Version control (future)
      version: 1,
      previous_versions: []
    };

    await db.set(`blogPosts:${id}`, post);
    await db.set(`blogSlugs:${slug}`, post);

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: req.user.id,
      action: 'blog.create',
      entity: 'blog',
      entity_id: id,
      details: { title, category, status, slug },
      timestamp: new Date().toISOString()
    });

    console.log('✅ Blog post created:', id);
    console.log('📝 Slug:', slug);
    console.log('📖 Reading time:', readingTime.text);

    res.status(201).json({
      success: true,
      post,
      message: 'Blog yazısı başarıyla oluşturuldu'
    });

  } catch (error) {
    console.error('💥 Create blog post error:', error);
    res.status(500).json({ error: 'Blog yazısı oluşturulamadı' });
  }
};

/**
 * Update blog post
 * @route PUT /api/blog/:id
 * @access Protected (Admin)
 */
export const updateBlogPost = async (req, res) => {
  try {
    const existingPost = await db.get(`blogPosts:${req.params.id}`);

    if (!existingPost) {
      return res.status(404).json({ error: 'Blog yazısı bulunamadı' });
    }

    const updates = req.body;
    let newSlug = existingPost.slug;

    // If title changed, generate new slug
    if (updates.title && updates.title !== existingPost.title) {
      newSlug = generateSlug(updates.title);

      // Check if new slug exists
      const slugExists = await db.get(`blogSlugs:${newSlug}`);
      if (slugExists && slugExists.id !== existingPost.id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }

      // Delete old slug reference
      await db.del(`blogSlugs:${existingPost.slug}`);
    }

    // Recalculate reading time if content changed
    let readingTime = existingPost.reading_time;
    if (updates.content) {
      readingTime = calculateReadingTime(updates.content);
    }

    // Auto-generate excerpt if content changed but no excerpt provided
    if (updates.content && !updates.excerpt) {
      updates.excerpt = extractExcerpt(updates.content);
    }

    // Save previous version
    const previousVersions = existingPost.previous_versions || [];
    previousVersions.push({
      version: existingPost.version,
      data: { ...existingPost },
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
      previous_versions: previousVersions.slice(-5) // Keep last 5 versions
    };

    // Handle publish status change
    if (updates.status === 'published' && !existingPost.publish_date) {
      updatedPost.publish_date = new Date().toISOString();
    }

    await db.set(`blogPosts:${req.params.id}`, updatedPost);
    await db.set(`blogSlugs:${newSlug}`, updatedPost);

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: req.user.id,
      action: 'blog.update',
      entity: 'blog',
      entity_id: req.params.id,
      details: {
        title: updatedPost.title,
        changes: Object.keys(updates),
        old_slug: existingPost.slug !== newSlug ? existingPost.slug : undefined,
        new_slug: existingPost.slug !== newSlug ? newSlug : undefined
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      post: updatedPost,
      message: 'Blog yazısı güncellendi'
    });

  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ error: 'Blog yazısı güncellenemedi' });
  }
};

/**
 * Delete blog post
 * @route DELETE /api/blog/:id
 * @access Protected (Admin)
 */
export const deleteBlogPost = async (req, res) => {
  try {
    const post = await db.get(`blogPosts:${req.params.id}`);

    if (!post) {
      return res.status(404).json({ error: 'Blog yazısı bulunamadı' });
    }

    await db.del(`blogPosts:${req.params.id}`);
    await db.del(`blogSlugs:${post.slug}`);

    // Activity log
    await db.set(`logs:${uuidv4()}`, {
      id: uuidv4(),
      user_id: req.user.id,
      action: 'blog.delete',
      entity: 'blog',
      entity_id: req.params.id,
      details: { title: post.title, slug: post.slug },
      timestamp: new Date().toISOString()
    });

    console.log('🗑️  Blog post deleted:', post.id);

    res.json({
      success: true,
      message: 'Blog yazısı silindi'
    });

  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ error: 'Blog yazısı silinemedi' });
  }
};

/**
 * Get blog categories
 * @route GET /api/blog/categories
 * @access Public
 */
export const getBlogCategories = async (req, res) => {
  try {
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

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Kategoriler getirilemedi' });
  }
};

/**
 * Get blog statistics
 * @route GET /api/blog/stats
 * @access Protected (Admin)
 */
export const getBlogStats = async (req, res) => {
  try {
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

      avgReadingTime: posts.reduce((sum, p) => sum + (p.reading_time?.minutes || 0), 0) / posts.length,

      topPosts: posts
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          views: p.views || 0,
          category: p.category
        })),

      categoriesBreakdown: {}
    };

    res.json(stats);

  } catch (error) {
    console.error('Get blog stats error:', error);
    res.status(500).json({ error: 'İstatistikler getirilemedi' });
  }
};
