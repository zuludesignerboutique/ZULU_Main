import { CanActivateFn } from '@angular/router';

export const adminGuard: CanActivateFn = () => {

  const isAdmin = localStorage.getItem('admin');

  if(isAdmin){
    return true;
  }

  alert("Access denied");
  return false;

};