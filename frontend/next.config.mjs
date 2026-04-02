import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    // These lines fix the WorkerError/Call Retries Exceeded crash:
    buildExcludes: [/middleware-manifest\.json$/],
    exclude: [
        ({ asset }) => {
            if (
                asset.name.startsWith("server/") ||
                asset.name.match(/^((app-|^)build-manifest\.json|react-loadable-manifest\.json)$/)
            ) {
                return true;
            }
            return false;
        }
    ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname : 'our-backend-api.onrender.com',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            },
            {
                protocol: 'http',
                hostname: '127.0.0.1',
            }
        ],
    },
    // Explicitly keep experimental features off to avoid conflicts
};

export default withPWA(nextConfig);