# API Documentation

This document describes every API endpoint in this repository, including paths, HTTP methods, authentication requirements, expected request payloads (body, params, query) and typical responses.

Base URL
- Replace with your deployment base, e.g. `https://api.example.com`.

Authentication
- Protected endpoints require header: Authorization: `Bearer <token>`.
- Admin-only endpoints are protected by an additional `adminOnly` middleware.

Response envelope
- Most endpoints return JSON in one of these shapes:
	- Success list/paginated: `{ data: <object|array>, total?, page?, limit?, totalPages? }` (200)
	- Success single: `{ success: true, message: string, data: <object|null> }` (200 or 201)
	- Error: `{ success: false, message: string }` with status codes 400/401/403/404/500.

---

## Auth

- POST /api/auth/register
	- Auth: public
	- Body: { name: string (required), email: string (required), password: string (required, min 6) }
	- Success: 201 `{ success: true, message, data: { user, token, refreshToken } }`
	- Errors: 400 missing fields, 409 duplicate email

- POST /api/auth/login
	- Auth: public
	- Body: { email: string (required), password: string (required) }
	- Success: 200 `{ success: true, message, data: { user, token, refreshToken } }`
	- Errors: 400 missing fields, 401 invalid credentials

- POST /api/auth/refresh
	- Auth: public
	- Body: { refreshToken: string (required) }
	- Success: 200 `{ success: true, message, data: { token } }`
	- Errors: 400 missing token, 401 invalid/expired token

- POST /api/auth/logout
	- Auth: protected
	- Body: { refreshToken: string }
	- Success: 200 `{ success: true, message: 'Logged out successfully', data: null }`

- GET /api/auth/profile
	- Auth: protected
	- Query/Params: none
	- Success: 200 `{ success: true, message: 'Profile fetched', data: <User> }`

- POST /api/auth/forgot-password
	- Auth: public
	- Body: { email: string (required) }
	- Success: 200 `{ success: true, message: 'Password reset email sent', data: null }`

- POST /api/auth/reset-password
	- Auth: public
	- Body: { token: string (required), newPassword: string (required) }
	- Success: 200 `{ success: true, message: 'Password reset successful', data: null }`

---

## Users

All `/api/users` routes are protected (see `routes/userRoutes.js`). Some routes require admin via `adminOnly`.

- GET /api/users
	- Auth: protected + adminOnly
	- Query: `page` (int), `limit` (int), `search` (string), `role` ('user'|'admin')
	- Success: 200 `{ data: [User], total, page, limit, totalPages }`

- GET /api/users/:id
	- Auth: protected + adminOnly
	- Params: `id` (user id)
	- Success: 200 `{ success: true, message, data: <User> }` or 404

- PUT /api/users/:id
	- Auth: protected (self or admin)
	- Params: `id`
	- Body: allowed fields: `{ name?: string, avatar?: string }`
	- Success: 200 `{ success: true, message, data: <UserWithoutPassword> }`

- PATCH /api/users/:id/role
	- Auth: protected + adminOnly
	- Body: `{ role: 'user'|'admin' }`
	- Success: 200 `{ success: true, message, data: <User> }`

- DELETE /api/users/:id
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, message: 'User deleted', data: null }`

- PUT /api/users/:id/password
	- Auth: protected (self only)
	- Body: `{ currentPassword: string (required), newPassword: string (required) }`
	- Success: 200 `{ success: true, message: 'Password changed successfully', data: null }`
	- Errors: 401 wrong current password, 403 access denied

- POST /api/users/:id/avatar
	- Auth: protected (self only)
	- Body: either multipart file (`req.file`) or `{ avatarUrl: string }`
	- Success: 200 `{ success: true, message: 'Avatar uploaded', data: { avatarUrl } }`

User model (fields reference) — see `models/User.js`: `name`, `email`, `password`, `role`, `avatar`, `isActive`, `subscription`, timestamps.

---

## Portfolios

- GET /api/portfolios/public/:slug
	- Auth: public
	- Params: `slug` (string)
	- Success: 200 `{ success: true, message: 'Portfolio fetched', data: <Portfolio> }`

The remaining portfolio routes require auth (see `routes/portfolioRoutes.js`).

- GET /api/portfolios
	- Auth: protected
	- Query: `page`, `limit`
	- Success: 200 `{ data: portfolios[], total, page, limit, totalPages }`

- POST /api/portfolios
	- Auth: protected
	- Body (example):
		{
			title: string (required),
			slug?: string (auto-generated if omitted),
			bio?: string,
			templateId?: string (ObjectId),
			themeConfig?: { primaryColor?, secondaryColor?, backgroundColor?, textColor?, fontFamily?, darkMode? },
			sections?: [ { type: string, title?: string, order?: number, isVisible?: boolean, content?: any } ],
			content?: object,
			metaTitle?: string,
			metaDescription?: string
		}
	- Success: 201 `{ success: true, message: 'Portfolio created', data: <Portfolio> }`

- GET /api/portfolios/:id
	- Auth: protected (owner or admin)
	- Params: `id`
	- Success: 200 `{ success: true, message: 'Portfolio fetched', data: <Portfolio> }`

- PUT /api/portfolios/:id
	- Auth: protected (owner or admin)
	- Body: same shape as create; partial or full updates accepted via service layer
	- Success: 200 `{ success: true, message: 'Portfolio updated', data: <Portfolio> }`

- DELETE /api/portfolios/:id
	- Auth: protected (owner or admin)
	- Success: 200 `{ success: true, message: 'Portfolio deleted', data: null }`

- PATCH /api/portfolios/:id/publish
	- Auth: protected
	- Success: 200 `{ success: true, message: 'Portfolio published', data: { id, isPublished, slug, updatedAt } }`

- PATCH /api/portfolios/:id/unpublish
	- Auth: protected
	- Success: 200 `{ success: true, message: 'Portfolio unpublished', data: { id, isPublished, updatedAt } }`

- GET /api/portfolios/:id/analytics
	- Auth: protected (owner or admin)
	- Query: `from` (ISO date), `to` (ISO date)
	- Success: 200 `{ success: true, message: 'Analytics fetched', data: { portfolioId, totalViews, uniqueVisitors, avgTimeOnPage, topCountries, viewsByDay[] } }`

Portfolio model (fields) — see `models/Portfolio.js`: `title`, `slug`, `bio`, `templateId`, `themeConfig`, `sections[]`, `isPublished`, `views`, `uniqueVisitors`, `content`, `metaTitle`, `metaDescription`.

---

## Templates

- GET /api/templates
	- Auth: public
	- Query: `page`, `limit`
	- Success: 200 `{ data: templates[], total, page, limit, totalPages }`

- GET /api/templates/:id
	- Auth: public
	- Success: 200 `{ success: true, message: 'Template fetched', data: <Template> }`

- POST /api/templates
	- Auth: protected + adminOnly
	- Body: `{ name: string (required), description?: string, previewImage?: string, category?: string, sections?: [string], layout?: string, isPremium?: boolean, defaultTheme?: {...} }`
	- Success: 201 `{ success: true, message: 'Template created', data: <Template> }`

- PUT /api/templates/:id
	- Auth: protected + adminOnly
	- Body: same fields as create
	- Success: 200 `{ success: true, message: 'Template updated', data: <Template> }`

- PATCH /api/templates/:id/toggle
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, message: 'Template status toggled', data: { id, isActive } }`

- DELETE /api/templates/:id
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, message: 'Template deleted', data: null }`

Template model: see `models/Template.js` for fields like `name`, `description`, `sections`, `layout`, `isPremium`, `defaultTheme`.

---

## Themes (admin)

All theme routes are protected + admin-only (`routes/themeRoutes.js`).

- GET /api/admin/themes
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, data: [Theme] }`

- POST /api/admin/themes
	- Auth: protected + adminOnly
	- Body: `{ name: string (required), description?: string, previewImage?: string, colors?: {...}, typography?: {...}, isDark?: boolean, isDefault?: boolean }`
	- Success: 201 `{ success: true, message: 'Theme created successfully.', data: <Theme> }`

- PUT /api/admin/themes/:id
	- Auth: protected + adminOnly
	- Body: update fields
	- Success: 200 `{ success: true, message: 'Theme updated successfully.', data: <Theme> }`

- DELETE /api/admin/themes/:id
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, message: 'Theme deleted successfully.' }`

Theme model fields: see `models/Theme.js`.

---

## Plans & Subscriptions

- GET /api/plans
	- Auth: public
	- Success: 200 `{ success: true, message: 'Plans fetched', data: [Plan] }` (static list)

Subscription routes (protected):

- POST /api/subscriptions/checkout
	- Auth: protected
	- Body: `{ planId: string (required), successUrl?: string, cancelUrl?: string }`
	- Notes: In non-production this returns a stub checkout URL; integrate Stripe for production.
	- Success: 200 `{ success: true, message: 'Checkout session created', data: { checkoutUrl } }`

- GET /api/subscriptions/current
	- Auth: protected
	- Success: 200 `{ success: true, message: 'Subscription fetched', data: { id, planId, planName, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd } }`

- POST /api/subscriptions/cancel
	- Auth: protected
	- Body: none
	- Success: 200 `{ success: true, message: 'Subscription will be cancelled at end of billing period', data: { cancelAtPeriodEnd: true, currentPeriodEnd } }`

---

## Analytics (admin)

All admin analytics routes are protected + adminOnly (`routes/analyticsRoutes.js`).

- GET /api/admin/analytics
	- Auth: protected + adminOnly
	- Success: 200 `{ success: true, message: 'Analytics fetched', data: { totalUsers, totalPortfolios, totalTemplates, activePortfolios, recentSignups, topTemplates[], revenueThisMonth, revenueLastMonth, signupsByDay[] } }`

- GET /api/admin/analytics/users
	- Auth: protected + adminOnly
	- Query: `from`, `to` (ISO dates)
	- Success: 200 `{ success: true, message: 'User analytics fetched', data: { newUsers, activeUsers, churnedUsers, retentionRate, usersByPlan } }`

Analytics model: see `models/Analytics.js` for `views`, `uniqueVisitors`, `dailyViews[]`.

---

## Contact

- POST /api/contact
	- Auth: public
	- Body: `{ name: string (required), email: string (required), subject: string (required), message: string (required) }`
	- Success: 200 `{ success: true, message: 'Message sent successfully', data: null }`
	- Errors: 400 validation errors

---

## Error codes / common responses
- 400 Bad Request — missing or invalid input (e.g., validation failures)
- 401 Unauthorized — invalid credentials / missing token
- 403 Forbidden — access denied (not owner, not admin)
- 404 Not Found — resource not found
- 500 Internal Server Error — unexpected server error

---

## How to expand to OpenAPI
- To generate OpenAPI/Swagger, iterate through `routes/*.js` and `controllers/*.js` and transcribe each endpoint's request/response schema into an OpenAPI YAML or JSON file. If you want, I can generate a `openapi.yaml` for this project.

Generated from routes/controllers/models in this repository (concise reference). For any endpoint where you want example payloads or additional details, tell me which endpoint(s) and I'll add concrete request/response examples.
