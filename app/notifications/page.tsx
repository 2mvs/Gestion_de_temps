'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  Settings,
  Mail,
  MessageSquare
} from 'lucide-react';
import Layout from '@/components/Layout';
import { isAuthenticated } from '@/lib/auth';
import { notificationsAPI } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface Notification {
  id: number;
  type: 'EMAIL' | 'IN_APP' | 'SMS';
  subject?: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: 'VALIDATION' | 'APPROVAL' | 'ALERT' | 'REMINDER' | 'SYSTEM';
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadNotifications();
    loadUnreadCount();
  }, [router, filter, selectedCategory]);

  const loadNotifications = async () => {
    try {
      const params: any = {
        limit: 100,
        offset: 0
      };

      if (filter === 'unread') {
        params.unreadOnly = true;
      } else if (filter === 'category' && selectedCategory) {
        params.category = selectedCategory;
      }

      const response = await notificationsAPI.getAll(params);
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error('Erreur chargement compteur:', error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur marquage lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage tous lus:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      // Recharger le compteur
      loadUnreadCount();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'MEDIUM':
        return <Info className="w-5 h-5 text-blue-600" />;
      case 'LOW':
        return <Clock className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'VALIDATION':
        return 'bg-purple-100 text-purple-800';
      case 'APPROVAL':
        return 'bg-green-100 text-green-800';
      case 'ALERT':
        return 'bg-yellow-100 text-yellow-800';
      case 'REMINDER':
        return 'bg-blue-100 text-blue-800';
      case 'SYSTEM':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="w-4 h-4" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4" />;
      case 'IN_APP':
        return <Bell className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const categories = [
    { value: 'VALIDATION', label: 'Validation' },
    { value: 'APPROVAL', label: 'Approbation' },
    { value: 'ALERT', label: 'Alerte' },
    { value: 'REMINDER', label: 'Rappel' },
    { value: 'SYSTEM', label: 'Système' }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">Gérez vos notifications et alertes</p>
            </div>

            {unreadCount > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {unreadCount} notification(s) non lue(s)
                </span>
                <Button onClick={markAllAsRead} size="sm">
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Tout marquer comme lu
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filtre:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes</option>
                <option value="unread">Non lues</option>
                <option value="category">Par catégorie</option>
              </select>
            </div>

            {filter === 'category' && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Catégorie:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            )}

            <Button onClick={loadNotifications} variant="secondary" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </Card>

        {/* Liste des notifications */}
        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Card key={notification.id} className={`transition-all ${!notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getPriorityIcon(notification.priority)}
                      <div className="flex items-center gap-2">
                        {getTypeIcon(notification.type)}
                        <Badge className={getCategoryColor(notification.category)}>
                          {notification.category}
                        </Badge>
                        <Badge className={getPriorityColor(notification.priority)}>
                          {notification.priority}
                        </Badge>
                        {!notification.isRead && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Non lu
                          </Badge>
                        )}
                      </div>
                    </div>

                    {notification.subject && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {notification.subject}
                      </h3>
                    )}

                    <div className="text-gray-700 mb-3 whitespace-pre-line">
                      {notification.message}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {new Date(notification.createdAt).toLocaleString('fr-FR')}
                      </span>
                      {notification.expiresAt && (
                        <span className="text-orange-600">
                          Expire le {new Date(notification.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {notification.actionUrl && (
                      <Button
                        size="sm"
                        onClick={() => router.push(notification.actionUrl!)}
                      >
                        Action
                      </Button>
                    )}

                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                </h3>
                <p className="text-gray-600">
                  {filter === 'unread'
                    ? 'Vous avez lu toutes vos notifications.'
                    : 'Vous n\'avez aucune notification pour le moment.'
                  }
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
