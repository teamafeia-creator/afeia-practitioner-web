'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ConsultantData = {
  id: string
  full_name?: string
  first_name?: string
  last_name?: string
  email: string
  is_premium?: boolean
  practitioner_id: string
  practitioners?: {
    name?: string
    full_name?: string
    phone?: string
    email?: string
  }
}

type Message = {
  id: string
  content?: string
  body?: string
  sender_type?: string
  sender_role?: string
  created_at: string
  read?: boolean
}

type CarePlan = {
  id: string
  title: string
  description?: string
  content?: Record<string, string>
  status: string
  created_at: string
}

export default function ConsultantHomePage() {
  const router = useRouter()
  const [consultant, setConsultant] = useState<ConsultantData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [plans, setPlans] = useState<CarePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('Bonjour')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bonjour')
    else if (hour < 18) setGreeting('Bon après-midi')
    else setGreeting('Bonsoir')
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/consultant/login')
        return
      }

      console.log('[consultant] Loading data for:', user.id)

      // Nouveau flow: chercher le consultant directement par son ID (qui est le même que l'auth user ID)
      let consultantData = null

      // D'abord essayer avec l'ID directement (nouveau flow)
      const { data: directConsultant } = await supabase
        .from('consultants')
        .select('*, practitioners(name, full_name, phone, email)')
        .eq('id', user.id)
        .maybeSingle()

      if (directConsultant) {
        consultantData = directConsultant
      } else {
        // Fallback: ancien système avec consultant_memberships
        const { data: membership } = await supabase
          .from('consultant_memberships')
          .select('consultant_id')
          .eq('consultant_user_id', user.id)
          .maybeSingle()

        if (membership?.consultant_id) {
          const { data } = await supabase
            .from('consultants')
            .select('*, practitioners(name, full_name, phone, email)')
            .eq('id', membership.consultant_id)
            .single()
          consultantData = data
        }
      }

      if (!consultantData) {
        console.error('Consultant non trouvé')
        setLoading(false)
        return
      }

      console.log('[consultant] Found:', consultantData.full_name || consultantData.first_name)
      setConsultant(consultantData)

      // Charger les messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('consultant_id', consultantData.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setMessages(messagesData || [])

      // Charger les plans (essayer les deux tables)
      const { data: carePlans } = await supabase
        .from('care_plans')
        .select('*')
        .eq('consultant_id', consultantData.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (carePlans && carePlans.length > 0) {
        setPlans(carePlans)
      } else {
        // Fallback vers consultant_plans
        const { data: consultantPlans } = await supabase
          .from('consultant_plans')
          .select('*')
          .eq('consultant_id', consultantData.id)
          .order('created_at', { ascending: false })
          .limit(3)
        setPlans(consultantPlans || [])
      }

    } catch (err) {
      console.error('Erreur chargement:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/consultant/login')
  }

  const unreadMessages = messages.filter(m =>
    (m.sender_type === 'practitioner' || m.sender_role === 'practitioner') && !m.read
  ).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8F9FB] to-[#EDF2F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#6B8DC9] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#718096]">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  if (!consultant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8F9FB] to-[#EDF2F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-[#2D3748] mb-2">Compte non trouvé</h1>
          <p className="text-[#718096] mb-4">
            Votre profil consultant n&apos;a pas été trouvé. Veuillez contacter votre naturopathe.
          </p>
          <button
            onClick={handleLogout}
            className="text-[#6B8DC9] hover:underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  const practitionerName = consultant.practitioners?.name || consultant.practitioners?.full_name || 'Votre naturopathe'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F9FB] to-[#EDF2F7]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B8DC9] to-[#9B8DC9] text-white px-6 py-8 rounded-b-3xl">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-sm">{greeting}</p>
              <h1 className="text-2xl font-bold mt-1">
                {consultant.first_name || consultant.full_name?.split(' ')[0] || 'Consultant'}
              </h1>
              {consultant.is_premium && (
                <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1 rounded-full mt-2">
                  Premium
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-white/80 hover:text-white"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 -mt-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/consultant/messages')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left relative"
          >
            <div className="w-10 h-10 bg-[#6B8DC9]/10 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#6B8DC9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
            </div>
            <p className="font-medium text-[#2D3748]">Messages</p>
            <p className="text-xs text-[#718096]">
              {unreadMessages > 0 ? `${unreadMessages} non lu(s)` : 'Discuter'}
            </p>
            {unreadMessages > 0 && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-[#E07A7A] text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessages}
              </div>
            )}
          </button>

          <button
            onClick={() => router.push('/consultant/journal')}
            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-[#9B8DC9]/10 rounded-xl flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-[#9B8DC9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <p className="font-medium text-[#2D3748]">Journal</p>
            <p className="text-xs text-[#718096]">Mes humeurs</p>
          </button>
        </div>

        {/* Naturopath Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#7BA591] to-[#6B8DC9] rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#718096] uppercase tracking-wide">Mon naturopathe</p>
              <p className="font-semibold text-[#2D3748]">{practitionerName}</p>
              {consultant.practitioners?.phone && (
                <p className="text-sm text-[#718096]">{consultant.practitioners.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Plans Section */}
        {plans.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#2D3748]">Mes plans de santé</h2>
              <span className="text-xs text-[#718096] bg-[#F7FAFC] px-2 py-1 rounded-full">
                {plans.length} plan(s)
              </span>
            </div>
            <div className="space-y-3">
              {plans.slice(0, 2).map((plan) => (
                <div
                  key={plan.id}
                  className="border border-[#E2E8F0] rounded-xl p-4 hover:border-[#6B8DC9] transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-[#2D3748]">{plan.title || 'Conseillancier'}</p>
                      {plan.description && (
                        <p className="text-sm text-[#718096] mt-1 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      plan.status === 'sent' || plan.status === 'shared'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.status === 'sent' || plan.status === 'shared' ? 'Nouveau' : plan.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Messages */}
        {messages.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-[#2D3748]">Derniers messages</h2>
              <button
                onClick={() => router.push('/consultant/messages')}
                className="text-sm text-[#6B8DC9] hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="space-y-3">
              {messages.slice(0, 3).map((msg) => {
                const isPractitioner = msg.sender_type === 'practitioner' || msg.sender_role === 'practitioner'
                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isPractitioner
                        ? 'bg-[#7BA591]/10 text-[#7BA591]'
                        : 'bg-[#6B8DC9]/10 text-[#6B8DC9]'
                    }`}>
                      {isPractitioner ? 'N' : 'M'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#718096]">
                        {isPractitioner ? practitionerName : 'Vous'}
                      </p>
                      <p className="text-sm text-[#2D3748] truncate">
                        {msg.content || msg.body || 'Message'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && plans.length === 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-[#6B8DC9]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6B8DC9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
            </div>
            <h2 className="font-semibold text-[#2D3748] mb-2">Bienvenue !</h2>
            <p className="text-sm text-[#718096]">
              Votre espace est prêt. Votre naturopathe va bientôt partager vos premiers conseils.
            </p>
          </div>
        )}

        {/* Bottom Spacer */}
        <div className="h-4" />
      </div>
    </div>
  )
}
