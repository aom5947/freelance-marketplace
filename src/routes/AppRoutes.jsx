import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { PageLoader } from '@/components/common/LoadingSkeleton'

const LandingPage = lazy(() => import('@/pages/public/LandingPage'))
const BrowseJobs = lazy(() => import('@/pages/public/BrowseJobs'))
const JobDetails = lazy(() => import('@/pages/public/JobDetails'))
const FreelancerDirectory = lazy(() => import('@/pages/public/FreelancerDirectory'))
const FreelancerProfile = lazy(() => import('@/pages/public/FreelancerProfile'))
const HowItWorks = lazy(() => import('@/pages/public/HowItWorks'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))

const ClientDashboard = lazy(() => import('@/pages/client/ClientDashboard'))
const CreateJob = lazy(() => import('@/pages/client/CreateJob'))
const ManageJobs = lazy(() => import('@/pages/client/ManageJobs'))
const JobApplicants = lazy(() => import('@/pages/client/JobApplicants'))
const CompareProposals = lazy(() => import('@/pages/client/CompareProposals'))
const HiringHistory = lazy(() => import('@/pages/client/HiringHistory'))
const ReviewWork = lazy(() => import('@/pages/client/ReviewWork'))
const EscrowPayment = lazy(() => import('@/pages/client/EscrowPayment'))
const ClientProfile = lazy(() => import('@/pages/client/ClientProfile'))

const FreelancerDashboard = lazy(() => import('@/pages/freelancer/FreelancerDashboard'))
const SubmitProposal = lazy(() => import('@/pages/freelancer/SubmitProposal'))
const MyProposals = lazy(() => import('@/pages/freelancer/MyProposals'))
const SubmitWork = lazy(() => import('@/pages/freelancer/SubmitWork'))
const Earnings = lazy(() => import('@/pages/freelancer/Earnings'))
const TransactionHistoryPage = lazy(() => import('@/pages/freelancer/TransactionHistory'))
const FreelancerReviews = lazy(() => import('@/pages/freelancer/Reviews'))
const ProfileSettings = lazy(() => import('@/pages/freelancer/ProfileSettings'))

const ActiveProjects = lazy(() => import('@/pages/shared/ActiveProjects'))
const ProjectDetails = lazy(() => import('@/pages/shared/ProjectDetails'))
const Notifications = lazy(() => import('@/pages/shared/Notifications'))
const Messages = lazy(() => import('@/pages/shared/Messages'))
const WalletPage = lazy(() => import('@/pages/shared/WalletPage'))
const TransactionDetails = lazy(() => import('@/pages/shared/TransactionDetails'))
const Settings = lazy(() => import('@/pages/shared/Settings'))
const HelpPage = lazy(() => import('@/pages/shared/HelpPage'))
const AdminConsole = lazy(() => import('@/pages/admin/AdminConsole'))

const withSuspense = (element) => <Suspense fallback={<PageLoader />}>{element}</Suspense>

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={withSuspense(<LandingPage />)} />
        <Route path="jobs" element={withSuspense(<BrowseJobs />)} />
        <Route path="jobs/:jobId" element={withSuspense(<JobDetails />)} />
        <Route path="freelancers" element={withSuspense(<FreelancerDirectory />)} />
        <Route path="freelancers/:freelancerId" element={withSuspense(<FreelancerProfile />)} />
        <Route path="how-it-works" element={withSuspense(<HowItWorks />)} />
        <Route path="help" element={withSuspense(<HelpPage />)} />
        <Route path="*" element={withSuspense(<NotFound />)} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={withSuspense(<Login />)} />
        <Route path="register" element={withSuspense(<Register />)} />
      </Route>

      <Route element={<ProtectedRoute role="client" />}>
        <Route element={<DashboardLayout />}>
          <Route path="client/dashboard" element={withSuspense(<ClientDashboard />)} />
          <Route path="client/jobs" element={withSuspense(<ManageJobs />)} />
          <Route path="client/jobs/new" element={withSuspense(<CreateJob />)} />
          <Route path="client/jobs/:jobId/edit" element={withSuspense(<CreateJob />)} />
          <Route path="client/jobs/:jobId/applicants" element={withSuspense(<JobApplicants />)} />
          <Route path="client/jobs/:jobId/compare" element={withSuspense(<CompareProposals />)} />
          <Route path="client/projects" element={withSuspense(<ActiveProjects />)} />
          <Route path="client/projects/:projectId" element={withSuspense(<ProjectDetails />)} />
          <Route path="client/projects/:projectId/review" element={withSuspense(<ReviewWork />)} />
          <Route path="client/projects/:projectId/escrow" element={withSuspense(<EscrowPayment />)} />
          <Route path="client/history" element={withSuspense(<HiringHistory />)} />
          <Route path="client/profile" element={withSuspense(<ClientProfile />)} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="freelancer" />}>
        <Route element={<DashboardLayout />}>
          <Route path="freelancer/dashboard" element={withSuspense(<FreelancerDashboard />)} />
          <Route path="freelancer/jobs" element={withSuspense(<BrowseJobs />)} />
          <Route path="freelancer/jobs/:jobId" element={withSuspense(<JobDetails />)} />
          <Route path="freelancer/proposals" element={withSuspense(<MyProposals />)} />
          <Route
            path="freelancer/proposals/new/:jobId"
            element={withSuspense(<SubmitProposal />)}
          />
          <Route path="freelancer/projects" element={withSuspense(<ActiveProjects />)} />
          <Route path="freelancer/projects/:projectId" element={withSuspense(<ProjectDetails />)} />
          <Route
            path="freelancer/projects/:projectId/submit"
            element={withSuspense(<SubmitWork />)}
          />
          <Route path="freelancer/earnings" element={withSuspense(<Earnings />)} />
          <Route path="freelancer/transactions" element={withSuspense(<TransactionHistoryPage />)} />
          <Route path="freelancer/reviews" element={withSuspense(<FreelancerReviews />)} />
          <Route path="freelancer/profile" element={withSuspense(<ProfileSettings />)} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="notifications" element={withSuspense(<Notifications />)} />
          <Route path="messages" element={withSuspense(<Messages />)} />
          <Route path="messages/:threadId" element={withSuspense(<Messages />)} />
          <Route path="wallet" element={withSuspense(<WalletPage />)} />
          <Route path="transactions/:transactionId" element={withSuspense(<TransactionDetails />)} />
          <Route path="settings" element={withSuspense(<Settings />)} />
          <Route path="admin" element={withSuspense(<AdminConsole />)} />
          <Route path="admin/:section" element={withSuspense(<AdminConsole />)} />
        </Route>
      </Route>
    </Routes>
  )
}
