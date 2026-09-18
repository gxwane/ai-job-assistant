import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/upload',
    name: 'ResumeUpload',
    component: () => import('../views/ResumeUpload.vue'),
  },
  {
    path: '/analyze',
    name: 'JobAnalyze',
    component: () => import('../views/JobAnalyze.vue'),
  },
  {
    path: '/result/:id',
    name: 'Result',
    component: () => import('../views/Result.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/History.vue'),
  },
  {
    path: '/plugin-jobs',
    name: 'PluginJobs',
    component: () => import('../views/PluginJobs.vue'),
  },
  {
    path: '/resumes',
    name: 'ResumeManager',
    component: () => import('../views/ResumeManager.vue'),
  },
  {
    path: '/interview-questions/:id',
    name: 'InterviewQuestions',
    component: () => import('../views/InterviewQuestions.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/job-detail/:id',
    name: 'JobDetail',
    component: () => import('../views/JobDetail.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
