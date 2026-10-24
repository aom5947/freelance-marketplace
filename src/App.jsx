import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { WalletProvider } from '@/contexts/WalletContext'
import { ToastViewport } from '@/components/common/ToastNotification'
import { AppRoutes } from '@/routes/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <WalletProvider>
            <AppRoutes />
            <ToastViewport />
          </WalletProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
