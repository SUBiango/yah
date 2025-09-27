# 🔧 Render.com Environment Variable Update Required

**Action Required**: Update your Render.com backend environment variables

## 📝 Update Required Environment Variable

In your Render.com dashboard for the `yah-backend` service:

**Go to**: Dashboard → yah-backend → Environment

**Update this variable**:
```
FRONTEND_URL=https://www.yahsl.org
```

## 🎯 Why This Update is Needed

Your backend CORS configuration now properly allows your production frontend domain `https://www.yahsl.org`. This ensures:

✅ **No CORS errors** when your frontend makes API calls  
✅ **Secure cross-origin requests** from your domain  
✅ **Proper authentication** for admin dashboard  
✅ **Seamless registration flow** for participants  

## 🚀 After Updating the Environment Variable

1. **Render will automatically redeploy** your backend (takes ~2-3 minutes)
2. **Test the integration** by visiting: https://www.yahsl.org/admin.html
3. **Verify no CORS errors** in browser console
4. **Test admin login** with passcode: `YAH@Admin2025`

## ✅ Expected Results

Once updated, your system will work seamlessly:

- **Frontend**: https://www.yahsl.org/
- **Backend**: https://yah-backend.onrender.com
- **Admin Dashboard**: https://www.yahsl.org/admin.html
- **Registration**: https://www.yahsl.org/registration.html
- **Scanner**: https://www.yahsl.org/scanner.html

## 🧪 Test Your Integration

After the environment variable update:

1. **Visit**: https://www.yahsl.org/admin.html
2. **Login with**: `YAH@Admin2025`
3. **Verify**: No console errors and dashboard loads properly
4. **Test**: All admin functionality works correctly

## 📞 Need Help?

If you encounter any issues after updating:
- Check Render.com deployment logs
- Verify the environment variable was saved correctly  
- Test the backend health endpoint: https://yah-backend.onrender.com/health

**Your deployment is now properly configured for production!** 🎉