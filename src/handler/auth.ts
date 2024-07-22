import type { Route } from './types'

export const authRoutes: Route = {
  routePrefix: '/auth',
  folder: 'auth',
  routes: [{
    path: '/mfa/status',
    method: 'GET',
    file: 'mfa/status',
  },{
    path: '/mfa/enroll',
    method: 'POST',
    file: 'mfa/enroll',
  },{
    path: '/mfa/verify',
    method: 'POST',
    file: 'mfa/verify',
  },{
    path: '/method',
    method: 'POST',
    file: 'method',
  },{
    path: '/external',
    method: 'GET',
    file: 'external',
  },{
    path: '/me',
    method: 'GET',
    file: 'me',
  },{
    path: '/newuser',
    method: 'POST',
    file: 'newuser',
  },{
    path: '/newproject',
    method: 'POST',
    file: 'newproject',
  },{
    path: '/newpatient',
    method: 'POST',
    file: 'newpatient',
  },{
    path: '/login',
    method: 'POST',
    file: 'login',
  },{
    path: '/profile',
    method: 'POST',
    file: 'profile',
  },{
    path: '/scope',
    method: 'POST',
    file: 'scope',
  },{
    path: '/changepassword',
    method: 'POST',
    file: 'changepassword',
  },{
    path: '/resetpassword',
    method: 'POST',
    file: 'resetpassword',
  },{
    path: '/setpassword',
    method: 'POST',
    file: 'setpassword',
  },{
    path: '/verifyemail',
    method: 'POST',
    file: 'verifyemail',
  },{
    path: '/google',
    method: 'POST',
    file: 'google',
  },{
    path: '/exchange',
    method: 'POST',
    file: 'exchange',
  },{
    path: '/revoke',
    method: 'POST',
    file: 'revoke',
  },{
    path: '/login/:login',
    method: 'GET',
    file: 'status',
  }]
}