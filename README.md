# Lead-to-Cash Analytics Dashboard

A comprehensive analytics platform for monitoring sales pipeline performance, lead-to-cash metrics, and operational KPIs. Built with Next.js, TypeScript, and Supabase, with seamless integrations to Salesforce and NetSuite for real-time data insights.

## 📊 Key Features

### 📈 Advanced Analytics Dashboard
- **Real-time Metrics**: Opportunity-to-quote, quote-to-order, and order-to-cash cycle times
- **Performance Tracking**: Target vs actual performance with trend analysis and status indicators
- **Period Comparisons**: Month-over-month and quarter-over-quarter insights with detailed breakdowns
- **Interactive Visualizations**: Click-through metrics with modal details and drill-down capabilities
- **Metric Grid**: Comprehensive overview of all KPIs with color-coded status indicators

### 🔄 Flow Analysis & Pipeline Management
- **Pipeline Visualization**: Interactive flow diagram showing sales stages and conversion rates
- **Bottleneck Identification**: Visual identification of process inefficiencies and delays
- **Stage Performance**: Detailed metrics for each pipeline stage with time-to-conversion analysis
- **Root Cause Analysis**: Drill-down capabilities for performance issues with detailed breakdowns
- **Flow Details Modal**: Comprehensive view of stage-specific data and trends
- **Unified Data Source**: Flow tab now uses the same data source as dashboard for consistency

### 💾 Data Management & Integration
- **Raw Data Explorer**: Interactive tables with advanced filtering, sorting, and pagination
- **Multi-Currency Support**: Automatic currency conversion with real-time exchange rates
- **Data Integration**: Direct connections to Salesforce (Opportunities, Quotes, Orders) and NetSuite (Invoices, Payments)
- **Export Capabilities**: Download filtered datasets in various formats for further analysis
- **Data Cleaning**: Automated duplicate detection and cleanup utilities

### 🔐 Authentication & Security
- **Secure Access**: Supabase-powered authentication with email/password and OAuth
- **User Management**: Admin controls for user access and role management
- **Role-based Permissions**: Secure data access controls with tenant isolation
- **Protected Routes**: Secure API endpoints with proper authentication checks

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark/Light Mode**: Theme switching with system preference detection
- **Loading States**: Comprehensive loading indicators and skeleton screens
- **Error Handling**: Graceful error handling with user-friendly messages
- **Accessibility**: WCAG compliant components with keyboard navigation

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern component library
- **Recharts** - Data visualization library
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL
- **PostgreSQL** - Primary database with optimized views
- **Row Level Security** - Database-level security policies
- **Real-time Subscriptions** - Live data updates

### Integrations
- **Salesforce API** - CRM data integration with OAuth 2.0
- **NetSuite API** - ERP data integration
- **Exchange Rate APIs** - Real-time currency conversion

### Development Tools
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **TypeScript** - Static type checking

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── metrics/       # Analytics endpoints
│   │   │   └── dashboard-unified/  # Unified dashboard API
│   │   ├── salesforce/    # Salesforce integration
│   │   ├── netsuite/      # NetSuite integration
│   │   └── currency/      # Currency conversion
│   ├── auth/              # Authentication pages
│   ├── flow/              # Flow analysis page
│   ├── raw-data/          # Data explorer page
│   └── setup/             # Configuration page
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard-specific components
│   ├── flow/              # Flow visualization components
│   ├── ui/                # Reusable UI components
│   └── *.tsx              # Feature components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
│   ├── useDashboardData.ts    # Unified data hook
│   ├── useRawData.ts          # Raw data hook
│   └── use-*.ts               # Utility hooks
├── lib/                   # Utility functions and services
│   ├── constants.ts           # App constants and configurations
│   ├── flowConstants.ts       # Flow-specific constants
│   ├── metricUtils.ts         # Metric calculation utilities
│   └── *.ts                   # Service files
└── integrations/          # External service integrations
    └── supabase/          # Supabase client configuration
```

## 🎯 Key Metrics Tracked

- **Opportunity to Quote Time** - Average days from opportunity creation to quote
- **Quote to Order Time** - Average days from quote to order conversion
- **Order to Cash Time** - Average days from order to payment
- **Lead to Cash Time** - End-to-end pipeline duration
- **Active Price Books** - Number of active pricing catalogs
- **Product Catalogue Size** - Total number of products
- **Credit Memo Ratio** - Credit memos as percentage of invoices
- **Contract Renewal Rate** - On-time contract renewals percentage

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Salesforce API access (optional)
- NetSuite API access (optional)

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations in Supabase
5. Start development server: `npm run dev`

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Salesforce
SF_CLIENT_ID=your_salesforce_client_id
SF_CLIENT_SECRET=your_salesforce_client_secret
SF_REDIRECT_URI=https://your-domain.com/api/salesforce/callback
SF_DOMAIN=https://login.salesforce.com
SF_API_VERSION=v62.0

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_ADMIN_EMAIL=admin@yourcompany.com
```

### Database Setup
1. Create a new Supabase project
2. Run the SQL migrations in the `supabase/` directory
3. Set up Row Level Security policies
4. Configure authentication settings

### Configuration
- **Supabase**: Configure database connection and authentication
- **Salesforce**: Set up OAuth credentials for CRM integration
- **NetSuite**: Configure API access for ERP data

## 📊 Performance Optimizations

- **Database Views**: Optimized views for complex queries
- **Caching**: Multi-layer caching for API responses
- **Lazy Loading**: Component and route-based code splitting
- **Image Optimization**: Next.js automatic image optimization
- **Query Optimization**: Efficient database queries with proper indexing

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Static site deployment
- **Railway**: Full-stack deployment
- **Docker**: Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## 🔄 Recent Updates

- ✅ **Unified Data Architecture**: Flow tab now uses the same data source as dashboard for consistency
- ✅ **Code Cleanup**: Removed unused flow-specific hooks, APIs, and components
- ✅ **Status Alignment**: Flow tab status indicators now match dashboard exactly
- ✅ **Performance Optimization**: Streamlined data fetching and reduced code duplication
- ✅ **Enhanced Analytics**: Improved metric calculations and 90th percentile calculations
- ✅ **Better UX**: Consistent filtering and data display across all tabs
- ✅ **Code Quality**: Removed 10+ unused files and consolidated data logic

## 🏗️ Architecture Highlights

### Unified Data Flow
```
Dashboard Tab ←→ useDashboardData ←→ /api/metrics/dashboard-unified
     ↕
Flow Tab ←→ useDashboardData ←→ /api/metrics/dashboard-unified
```

### Status System
- **Good**: Green - Performance within target range
- **Okay**: Blue - Performance within tolerance range  
- **Bad**: Red - Performance outside tolerance range
- **No Data**: Gray - No data available

### Key Components
- **DashboardFilters**: Unified filtering component used by both tabs
- **FlowVisualization**: Interactive pipeline visualization
- **MetricCard**: Reusable metric display component
- **FlowDetailsModal**: Detailed data drill-down modal

## 🔍 Troubleshooting

### Common Issues
1. **Data not loading**: Check Supabase connection and API keys
2. **Authentication issues**: Verify Supabase auth configuration
3. **Integration errors**: Check Salesforce/NetSuite API credentials
4. **Performance issues**: Review database queries and caching

### Debug Mode
Enable debug logging by setting `NEXT_PUBLIC_DEBUG=true` in your environment variables.

## 📈 Future Roadmap

- [ ] Advanced analytics with machine learning insights
- [ ] Custom dashboard builder
- [ ] Real-time notifications and alerts
- [ ] Mobile app development
- [ ] Advanced reporting and PDF generation
- [ ] Multi-tenant architecture improvements