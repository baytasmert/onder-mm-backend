import { Resend } from 'resend';
import * as db from '../../db.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

/**
 * Mail Service
 * Resend integration for newsletters, notifications, and email campaigns
 */

// Initialize Resend
let resend = null;
if (config.email.resendApiKey) {
  resend = new Resend(config.email.resendApiKey);
} else {
  console.warn('⚠️  Resend API key not configured. Email features will be simulated.');
}

/**
 * Email Templates
 */
const templates = {
  // Welcome email for new subscribers
  welcomeSubscriber: (subscriberEmail) => ({
    subject: 'Önder Denetim E-Bültene Hoş Geldiniz!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Hoş Geldiniz!</h1>
            </div>
            <div class="content">
              <h2>Merhaba,</h2>
              <p>Önder Denetim e-bültenine abone olduğunuz için teşekkür ederiz!</p>
              <p>Artık güncel vergi mevzuatı, muhasebe haberleri ve mali danışmanlık konularında en yeni içerikleri düzenli olarak alacaksınız.</p>
              <p><strong>Ne tür içerikler alacaksınız?</strong></p>
              <ul>
                <li>✅ Güncel vergi mevzuatı değişiklikleri</li>
                <li>✅ Mali müşavirlik ipuçları</li>
                <li>✅ SGK ve sosyal güvenlik haberleri</li>
                <li>✅ Muhasebe uygulamaları</li>
                <li>✅ Vergi ve teşvik rehberleri</li>
              </ul>
              <a href="${config.frontend.url}/blog" class="button">Blog'umuzu Ziyaret Edin</a>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim ve Mali Müşavirlik</p>
              <p><a href="${config.frontend.url}/unsubscribe">Abonelikten Çık</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hoş Geldiniz!\n\nÖnder Denetim e-bültenine abone olduğunuz için teşekkür ederiz. Güncel vergi mevzuatı ve mali danışmanlık içerikleri için bizi takip edin.\n\n© 2026 Önder Denetim`
  }),

  // New blog post notification
  newBlogPost: (blog, subscriberEmail, unsubscribeToken) => ({
    subject: `📰 Yeni İçerik: ${blog.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #ddd; }
            .blog-meta { color: #666; font-size: 14px; margin-bottom: 15px; }
            .blog-excerpt { font-size: 16px; line-height: 1.8; }
            .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            img { max-width: 100%; height: auto; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📰 Yeni İçerik Yayınlandı!</h1>
            </div>
            <div class="content">
              ${blog.featured_image ? `<img src="${blog.featured_image}" alt="${blog.title}">` : ''}
              <h2>${blog.title}</h2>
              <div class="blog-meta">
                📂 ${blog.category} | 📖 ${blog.reading_time?.text || '5 dakikalık okuma'}
              </div>
              <div class="blog-excerpt">
                ${blog.excerpt}
              </div>
              <a href="${config.frontend.url}/blog/${blog.slug}" class="button">Devamını Oku</a>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim ve Mali Müşavirlik</p>
              <p><a href="${config.frontend.url}/unsubscribe?token=${unsubscribeToken}">Abonelikten Çık</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Yeni İçerik: ${blog.title}\n\n${blog.excerpt}\n\nDevamını okumak için: ${config.frontend.url}/blog/${blog.slug}`
  }),

  // New regulation notification
  newRegulation: (regulation, subscriberEmail, unsubscribeToken) => ({
    subject: `⚖️ Yeni Mevzuat: ${regulation.title}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #b91c1c; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #ddd; }
            .regulation-meta { background: #fee2e2; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .button { display: inline-block; padding: 12px 30px; background: #b91c1c; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚖️ Önemli Mevzuat Değişikliği!</h1>
            </div>
            <div class="content">
              <h2>${regulation.title}</h2>
              <div class="regulation-meta">
                <strong>📂 Kategori:</strong> ${regulation.category}<br>
                <strong>📅 Yürürlük Tarihi:</strong> ${new Date(regulation.regulation_date).toLocaleDateString('tr-TR')}
              </div>
              <p>${regulation.content.substring(0, 300)}...</p>
              <a href="${config.frontend.url}/mevzuat/${regulation.id}" class="button">Detayları Görüntüle</a>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim ve Mali Müşavirlik</p>
              <p><a href="${config.frontend.url}/unsubscribe?token=${unsubscribeToken}">Abonelikten Çık</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Yeni Mevzuat: ${regulation.title}\n\n${regulation.content}\n\nDetaylar: ${config.frontend.url}/mevzuat/${regulation.id}`
  }),

  // Contact form auto-response
  contactAutoResponse: (contactData) => ({
    subject: 'Mesajınızı Aldık - Önder Denetim',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #ddd; }
            .ticket-box { background: #f0f9ff; border: 2px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .ticket-id { font-size: 24px; font-weight: bold; color: #1e3a5f; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Mesajınız Alındı</h1>
            </div>
            <div class="content">
              <p>Sayın <strong>${contactData.name}</strong>,</p>
              <p>Bizimle iletişime geçtiğiniz için teşekkür ederiz. Mesajınızı aldık ve en kısa sürede size dönüş yapacağız.</p>

              <div class="ticket-box">
                <p style="margin: 0 0 10px 0; color: #666;">Takip Numaranız</p>
                <div class="ticket-id">${contactData.ticket_id}</div>
              </div>

              <p><strong>Mesaj Detayları:</strong></p>
              <ul>
                <li><strong>Konu:</strong> ${contactData.subject}</li>
                <li><strong>Tarih:</strong> ${new Date(contactData.created_at).toLocaleString('tr-TR')}</li>
                ${contactData.company ? `<li><strong>Şirket:</strong> ${contactData.company}</li>` : ''}
              </ul>
              <p>Genellikle 1-2 iş günü içinde yanıt veriyoruz.</p>
              <p>Acil durumlar için bizi arayabilirsiniz:<br>
              <strong>Tel:</strong> +90 XXX XXX XX XX<br>
              <strong>Email:</strong> info@onderdenetim.com</p>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim ve Mali Müşavirlik</p>
              <p>Bu email otomatik olarak gönderilmiştir.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Mesajınız Alındı\n\nSayın ${contactData.name},\n\nBizimle iletişime geçtiğiniz için teşekkür ederiz. En kısa sürede size dönüş yapacağız.\n\nTakip Numaranız: ${contactData.ticket_id}\nKonu: ${contactData.subject}\n\n© 2026 Önder Denetim`
  }),

  // Admin notification for new contact
  contactAdminNotification: (contactData) => ({
    subject: `🔔 Yeni İletişim Formu - ${contactData.ticket_id}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #ffffff; border: 1px solid #ddd; }
            .info-box { background: #f9f9f9; padding: 15px; border-left: 4px solid #1e3a5f; margin: 15px 0; }
            .label { font-weight: bold; color: #666; display: inline-block; width: 120px; }
            .button { display: inline-block; padding: 12px 30px; background: #1e3a5f; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Yeni İletişim Formu</h1>
            </div>
            <div class="content">
              <div class="info-box">
                <p style="margin: 0;"><span class="label">Ticket ID:</span> <strong>${contactData.ticket_id}</strong></p>
                <p style="margin: 5px 0 0 0;"><span class="label">Tarih:</span> ${new Date(contactData.created_at).toLocaleString('tr-TR')}</p>
              </div>

              <h3>İletişim Bilgileri</h3>
              <p><span class="label">Ad Soyad:</span> ${contactData.name}</p>
              <p><span class="label">Email:</span> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
              ${contactData.phone ? `<p><span class="label">Telefon:</span> <a href="tel:${contactData.phone}">${contactData.phone}</a></p>` : ''}
              ${contactData.company ? `<p><span class="label">Şirket:</span> ${contactData.company}</p>` : ''}

              <h3>Konu</h3>
              <p><strong>${contactData.subject}</strong></p>

              <h3>Mesaj</h3>
              <div class="info-box">
                <p>${contactData.message.replace(/\n/g, '<br>')}</p>
              </div>

              <h3>KVKK Bilgileri</h3>
              <p><span class="label">KVKK Onayı:</span> ✅ Onaylandı</p>
              <p><span class="label">Pazarlama İzni:</span> ${contactData.marketing_consent ? '✅ Var' : '❌ Yok'}</p>

              <h3>Teknik Bilgiler</h3>
              <p style="font-size: 12px; color: #666;">
                IP: ${contactData.ip_address}<br>
                User Agent: ${contactData.user_agent}<br>
                ${contactData.referrer ? `Referrer: ${contactData.referrer}` : ''}
              </p>

              <a href="${config.frontend.url}/admin/contacts/${contactData.id}" class="button">Admin Panelde Görüntüle</a>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim - Admin Notification</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Yeni İletişim Formu\n\nTicket: ${contactData.ticket_id}\nAd: ${contactData.name}\nEmail: ${contactData.email}\nTelefon: ${contactData.phone || 'Yok'}\nŞirket: ${contactData.company || 'Yok'}\n\nKonu: ${contactData.subject}\n\nMesaj:\n${contactData.message}\n\nKVKK Onayı: Var\nPazarlama İzni: ${contactData.marketing_consent ? 'Var' : 'Yok'}`
  })
};

/**
 * Send email using Resend
 */
const sendEmail = async ({ to, subject, html, text, from }) => {
  try {
    if (!resend) {
      // Simulate email sending in development
      console.log('\n📧 [EMAIL SIMULATION]');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('═══════════════════════════════════════\n');
      return {
        success: true,
        simulated: true,
        id: `sim_${uuidv4()}`
      };
    }

    const result = await resend.emails.send({
      from: from || `${config.email.from.name} <${config.email.from.email}>`,
      to,
      subject,
      html,
      text
    });

    return {
      success: true,
      id: result.id,
      simulated: false
    };

  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};

/**
 * Send welcome email to new subscriber
 */
export const sendWelcomeEmail = async (subscriberEmail, name, tempPassword) => {
  try {
    // If tempPassword provided, it's an admin welcome, not subscriber
    if (tempPassword) {
      return sendAdminWelcomeEmail(subscriberEmail, name, tempPassword);
    }

    const template = templates.welcomeSubscriber(subscriberEmail);

    const result = await sendEmail({
      to: subscriberEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    return result;

  } catch (error) {
    console.error('Send welcome email error:', error);
    throw error;
  }
};

/**
 * Send welcome email to new admin
 */
export const sendAdminWelcomeEmail = async (adminEmail, adminName, tempPassword) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .credentials { background: #fff; border: 2px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .credentials-title { font-weight: bold; margin-bottom: 10px; }
            .credential-item { padding: 8px 0; border-bottom: 1px solid #ddd; }
            .credential-item:last-child { border-bottom: none; }
            .label { color: #666; font-size: 12px; }
            .value { font-family: monospace; font-weight: bold; margin-top: 3px; }
            .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👤 Admin Paneline Hoş Geldiniz!</h1>
            </div>
            <div class="content">
              <h2>Merhaba ${adminName},</h2>
              <p>Önder Denetim admin paneline erişim izni verilmiştir.</p>
              
              <div class="credentials">
                <div class="credentials-title">🔐 Giriş Bilgileriniz</div>
                <div class="credential-item">
                  <div class="label">E-mail Adresi:</div>
                  <div class="value">${adminEmail}</div>
                </div>
                <div class="credential-item">
                  <div class="label">Geçici Şifre:</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ Önemli:</strong> Lütfen ilk girişinizde şifrenizi değiştirin. Geçici şifreniz güvenlik açısından paylaşılmıştır.
              </div>

              <p><strong>Admin Panele Erişim:</strong></p>
              <a href="${config.frontend.url}/admin" class="button">Admin Paneline Girin</a>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                Herhangi bir sorun yaşarsanız lütfen iletişime geçin.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 Önder Denetim ve Mali Müşavirlik</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await sendEmail({
      to: adminEmail,
      subject: '👤 Admin Paneli Erişim İzni',
      html: html,
      text: `Merhaba ${adminName},\n\nYeni bir admin hesabı oluşturulmuştur.\n\nE-mail: ${adminEmail}\nGeçici Şifre: ${tempPassword}\n\nLütfen ilk girişinizde şifrenizi değiştirin.\n\n© 2026 Önder Denetim`
    });

    return result;

  } catch (error) {
    console.error('Send admin welcome email error:', error);
    throw error;
  }
};

/**
 * Send new blog post to subscribers
 */
export const sendBlogNotification = async (blogId, recipientFilter = 'all') => {
  try {
    const blog = await db.get(`blogPosts:${blogId}`);
    if (!blog) {
      throw new Error('Blog post not found');
    }

    let subscribers = await db.getByPrefix('subscribers:');
    subscribers = subscribers.filter(s => s.is_active);

    if (recipientFilter === 'test') {
      // Send to first subscriber only (test mode)
      subscribers = subscribers.slice(0, 1);
    }

    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const subscriber of subscribers) {
      try {
        const template = templates.newBlogPost(blog, subscriber.email, subscriber.unsubscribe_token);

        await sendEmail({
          to: subscriber.email,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        results.sent++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          email: subscriber.email,
          error: error.message
        });
      }
    }

    // Save campaign record
    const campaignId = uuidv4();
    await db.set(`mailCampaigns:${campaignId}`, {
      id: campaignId,
      type: 'blog_notification',
      blog_id: blogId,
      blog_title: blog.title,
      recipients: recipientFilter,
      results,
      sent_at: new Date().toISOString()
    });

    return results;

  } catch (error) {
    console.error('Send blog notification error:', error);
    throw error;
  }
};

/**
 * Send new regulation notification to subscribers
 */
export const sendRegulationNotification = async (regulationId, recipientFilter = 'all') => {
  try {
    const regulation = await db.get(`regulations:${regulationId}`);
    if (!regulation) {
      throw new Error('Regulation not found');
    }

    let subscribers = await db.getByPrefix('subscribers:');
    subscribers = subscribers.filter(s => s.is_active);

    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const subscriber of subscribers) {
      try {
        const template = templates.newRegulation(regulation, subscriber.email, subscriber.unsubscribe_token);

        await sendEmail({
          to: subscriber.email,
          subject: template.subject,
          html: template.html,
          text: template.text
        });

        results.sent++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          email: subscriber.email,
          error: error.message
        });
      }
    }

    // Save campaign record
    const campaignId = uuidv4();
    await db.set(`mailCampaigns:${campaignId}`, {
      id: campaignId,
      type: 'regulation_notification',
      regulation_id: regulationId,
      regulation_title: regulation.title,
      recipients: recipientFilter,
      results,
      sent_at: new Date().toISOString()
    });

    return results;

  } catch (error) {
    console.error('Send regulation notification error:', error);
    throw error;
  }
};

/**
 * Send contact form auto-response
 */
export const sendContactAutoResponse = async (contactData) => {
  try {
    const template = templates.contactAutoResponse(contactData);

    const result = await sendEmail({
      to: contactData.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    return result;

  } catch (error) {
    console.error('Send contact auto-response error:', error);
    throw error;
  }
};

/**
 * Send admin notification for new contact form
 */
export const sendContactNotificationToAdmin = async (contactData) => {
  try {
    const template = templates.contactAdminNotification(contactData);

    // Send to admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'info@onderdenetim.com';

    const result = await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    return result;

  } catch (error) {
    console.error('Send admin notification error:', error);
    throw error;
  }
};

/**
 * Send custom email campaign
 */
export const sendCustomCampaign = async ({
  subject,
  htmlContent,
  textContent,
  recipientIds = [],
  sendToAll = false
}) => {
  try {
    let subscribers = await db.getByPrefix('subscribers:');
    subscribers = subscribers.filter(s => s.is_active);

    if (!sendToAll && recipientIds.length > 0) {
      subscribers = subscribers.filter(s => recipientIds.includes(s.id));
    }

    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const subscriber of subscribers) {
      try {
        await sendEmail({
          to: subscriber.email,
          subject,
          html: htmlContent,
          text: textContent || htmlContent.replace(/<[^>]*>/g, '')
        });

        results.sent++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          email: subscriber.email,
          error: error.message
        });
      }
    }

    // Save campaign record
    const campaignId = uuidv4();
    await db.set(`mailCampaigns:${campaignId}`, {
      id: campaignId,
      type: 'custom_campaign',
      subject,
      recipients: sendToAll ? 'all' : 'selected',
      recipient_count: subscribers.length,
      results,
      sent_at: new Date().toISOString()
    });

    return results;

  } catch (error) {
    console.error('Send custom campaign error:', error);
    throw error;
  }
};

/**
 * Get email campaign statistics
 */
export const getCampaignStats = async () => {
  try {
    const campaigns = await db.getByPrefix('mailCampaigns:');

    const stats = {
      total_campaigns: campaigns.length,
      total_emails_sent: campaigns.reduce((sum, c) => sum + (c.results?.sent || 0), 0),
      total_emails_failed: campaigns.reduce((sum, c) => sum + (c.results?.failed || 0), 0),

      by_type: {
        blog_notification: campaigns.filter(c => c.type === 'blog_notification').length,
        regulation_notification: campaigns.filter(c => c.type === 'regulation_notification').length,
        custom_campaign: campaigns.filter(c => c.type === 'custom_campaign').length
      },

      recent_campaigns: campaigns
        .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          type: c.type,
          subject: c.subject || c.blog_title || c.regulation_title,
          sent: c.results?.sent || 0,
          failed: c.results?.failed || 0,
          sent_at: c.sent_at
        }))
    };

    return stats;

  } catch (error) {
    console.error('Get campaign stats error:', error);
    throw error;
  }
};
