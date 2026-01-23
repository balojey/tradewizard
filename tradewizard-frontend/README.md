# TradeWizard Frontend

A Next.js-based web application that provides the user interface for accessing AI-generated market intelligence and executing trades.

## Features

- **Magic Link Authentication**: Passwordless authentication using Magic Link
- **Responsive Design**: Built with Tailwind CSS for mobile-first design
- **Real-time Market Data**: Integration with Polymarket API
- **Protected Routes**: Authentication-based route protection
- **User Dashboard**: Personalized trading dashboard
- **Modern UI**: Clean, professional interface with dark mode support

## Tech Stack

- **Framework**: Next.js 16.1.4 with React 19
- **Styling**: Tailwind CSS 4.0
- **Authentication**: Magic Link SDK
- **UI Components**: Custom components with Lucide React icons
- **Animation**: Framer Motion
- **TypeScript**: Full TypeScript support

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Magic Link account (for authentication)

### Installation

1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd tradewizard-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your Magic Link API key in `.env.local`:
   ```env
   NEXT_PUBLIC_MAGIC_API_KEY=your_magic_publishable_api_key_here
   ```

### Getting Magic Link API Key

1. Sign up at [Magic Link Dashboard](https://dashboard.magic.link/)
2. Create a new app
3. Copy your publishable API key from the dashboard
4. Add it to your `.env.local` file

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Authentication Flow

The application uses Magic Link for passwordless authentication:

1. **Login/Signup**: Users enter their email address
2. **Magic Link**: Magic sends a secure link to their email
3. **Verification**: Users click the link to authenticate
4. **Wallet Creation**: Magic automatically creates a non-custodial wallet
5. **Session Management**: Authentication state is managed globally

## Project Structure

```
src/
├── app/                          # Next.js app router
│   ├── dashboard/               # Protected dashboard page
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Home page
├── components/                  # React components
│   ├── auth/                   # Authentication components
│   │   ├── login-modal.tsx     # Login/signup modal
│   │   ├── user-menu.tsx       # User dropdown menu
│   │   ├── protected-route.tsx # Route protection
│   │   └── auth-guard.tsx      # Conditional rendering
│   ├── ui/                     # Base UI components
│   └── home-hero.tsx           # Landing page hero
└── lib/                        # Utility libraries
    ├── magic.tsx               # Magic Link provider
    ├── polymarket.ts           # Market data utilities
    └── utils.ts                # General utilities
```

## Key Components

### Authentication Components

- **MagicProvider**: Global authentication context provider
- **LoginModal**: Modal for email-based login/signup
- **UserMenu**: Dropdown menu for authenticated users
- **ProtectedRoute**: Component for protecting authenticated routes
- **AuthGuard**: Conditional rendering based on auth state

### UI Components

- **HomeHero**: Landing page with different content for auth states
- **Navbar**: Navigation with authentication integration
- **Dashboard**: Protected user dashboard

## Environment Variables

```env
# Magic Link Configuration
NEXT_PUBLIC_MAGIC_API_KEY=your_magic_publishable_api_key_here
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Authentication Features

- **Passwordless Login**: Email-based magic link authentication
- **Automatic Wallet Creation**: Non-custodial wallet created on signup
- **Session Persistence**: Authentication state persists across browser sessions
- **Route Protection**: Automatic redirection for protected pages
- **User Management**: Profile and wallet information display

## Integration with Backend

The frontend is designed to integrate with the TradeWizard Agents backend system for:

- Market analysis and recommendations
- Trade execution
- Portfolio management
- Real-time updates

## Contributing

1. Follow the existing code style and conventions
2. Use TypeScript for all new components
3. Ensure responsive design with Tailwind CSS
4. Test authentication flows thoroughly
5. Follow the project structure guidelines

## License

This project is part of the TradeWizard platform.