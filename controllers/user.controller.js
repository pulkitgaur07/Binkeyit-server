import UserModel from '../models/user.model.js';
import verifyEmailTemplate from '../utils/verifyEmailTemplate.js';
import sendEmail from '../config/sendEmail.js';
import bcryptjs from 'bcryptjs';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import generatedRefreshToken from '../utils/generatedRefreshToken.js';
import uploadImageCloudinary from '../utils/uploadImageCloudinary.js';
import generateOtp from '../utils/generateOtp.js';
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js';
import jwt from 'jsonwebtoken';

// Register
export async function registerUserController(request,response) {
    try {
        const { name, email, password } = request.body;

        if(!name || !email || !password){
            return response.status(400).json({
                message : "Provide Name, Email, Password",
                error : true,
                success : false
            })
        }

        const user = await UserModel.findOne({email});

        if(user){
            return response.json({
                message : "Aready register email",
                error : true,
                success : false
            })
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(password,salt);

        const payload = {
            name,
            email,
            password : hashPassword
        }

        const newUser = new UserModel(payload);
        const save = await newUser.save();

        const verifyEmailUrl = `${process.env.FRONTEND_URL}/verify-email?code=${save?._id}`

        const verifyEmail = await sendEmail({
            sendTo : email,
            subject : "Verify email from Binkeyit",
            html : verifyEmailTemplate({
                name,
                url : verifyEmailUrl
            })
        })

        return response.json({
            message : "User register successfully",
            error : false,
            success : true,
            data : save
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Verify Email 
export async function verifyEmailController(request,response){
    try{
        const { code } = request.body;

        const user = await UserModel.findOne({ _id : code });

        if(!user){
            response.status(400).json({
                message : "Invalid code",
                error : true,
                success : false
            })
        }

        const updateUser = await UserModel.updateOne({ _id : code }, {
            verify_email : true
        })

        return response.json({
            message : "Verify email done.",
            success : true,
            error : false
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : true
        })
    }
}

// Login
export async function loginController(request,response){
    try{
        const { email, password } = request.body;

        if(!email || !password){
            return response.status(400).json({
                message : "Provide email, password",
                error : true,
                success : false
            })
        }

        const user = await UserModel.findOne({ email });

        if(!user){
            return response.status(400).json({
                message : "User not register",
                error : true,
                success : false
            })
        }

        if(user.status !== "Active"){
            return response.status(400).json({
                message : "Contact to Admin",
                error : true,
                success : false
            })
        }

        const checkPassword = await bcryptjs.compare(password, user.password);

        if(!checkPassword){
            return response.status(400).json({
                message : "Check your password",
                error : true,
                success : false
            })
        }

        const accessToken = await generatedAccessToken(user._id);
        const refreshToken = await generatedRefreshToken(user._id);

        const updateUser  = await UserModel.findByIdAndUpdate(user?._id,{
            last_login_date : new Date()
        })

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        response.cookie('accessToken',accessToken,cookiesOption);
        response.cookie('refreshToken',refreshToken,cookiesOption); 

        return response.status(200).json({
            message : "Login successfully",
            error : false,
            success : true,
            data : {
                accessToken,
                refreshToken
            }
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Logout
export async function logoutController(request,response){
    try{

        const userid = request.userId; // middleware

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        response.clearCookie("accessToken",cookiesOption);
        response.clearCookie("refreshToken",cookiesOption);

        const removeRefreshToken = await UserModel.findByIdAndUpdate(userid,{
            refresh_token : ""
        })

        return response.json({
            message : "Logout successfully",
            error : false,
            success : true
        })
    }
    catch(error){
        response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Upload Avatar
export async function uploadAvatar(request,response){
    try{
        const userId = request.userId;
        const image = request.file;
        const upload = await uploadImageCloudinary(image);

        const updateUser = await UserModel.findByIdAndUpdate(userId,{
            avatar : upload.url
        })
        return response.json({
            message : 'Upload Profile',
            success : true,
            error : false,
            data : {
                _id : userId,
                avatar : updateUser.avatar
            }
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Update user details
export async function updateUserDetails(request,response){
    try{
        const userId = request.userId;
        const { name, email, mobile, password} = request.body;

        let hashPassword = ""

        if(password){
            const salt = await bcryptjs.genSalt(10);
            hashPassword = await bcryptjs.hash(password,salt);
        }

        const updateUser = await UserModel.updateOne({_id : userId},{
            ...(name && { name : name}),
            ...(email && { email : email}),
            ...(mobile && { mobile : mobile}),
            ...(password && {password : hashPassword})
        })

        return response.json({
            message : "updated user successfully",
            error : false,
            success : true,
            data : updateUser
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Forgot Password not Login
export async function forgotPasswordController(request,response){
    try{
        const { email } = request.body

        const user = await UserModel.findOne({ email });
        if(!user){
            return response.status(400).json({
                message : "Email id not available",
                error : true,
                success : false
            })
        }
        const otp = generateOtp()
        const expireTime = new Date() + 60*60*1000 // 1hr

        const update = await UserModel.findByIdAndUpdate(user._id,{
            forgot_password_otp : otp,
            forgot_password_expiry : new Date(expireTime).toISOString()
        })

        await sendEmail({
            sendTo : email,
            subject : "Forgot password from Binkeyit",
            html : forgotPasswordTemplate({
                name : user.name,
                otp : otp
            })
        })

        return response.json({
            message : "Check your email",
            error : false,
            success : true
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Verify Forgot Password otp
export async function verifyForgotPasswordOtp(request,response){
    try{
        const { email, otp} = request.body;
        if(!email || !otp){
            return response.status(400).json({
                message : "Provide required field email, otp",
                error : true,
                success : false
            })
        }
        const user = await UserModel.findOne({ email });

        if(!user){
            return response.status(400).json({
                message : "Email id not available",
                error : true,
                success : false
            })
        }

        const currentTime = new Date().toISOString();
        if(user.forgot_password_expiry < currentTime){
            return response.status(400).json({
                message : "Otp is expired",
                error : true,
                succes : false
            })
        }
        if(otp !== user.forgot_password_otp){
            return response.status(400).json({
                message : "Invalid otp",
                error : true,
                success : false
            })
        }
        // If otp is not expire and otp===user.forgot_password_otp

        const updateUser = await UserModel.findByIdAndUpdate(user?._id,{
            forgot_password_otp : "",
            forgot_password_expiry : ""
        })

        return response.json({
            message : "Verify otp successfully",
            error : false,
            success : true
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Reset the password
export async function resetPassword(request,response){
    try{
        const { email, newPassword, confirmPassword} = request.body;
        if(!email || !newPassword || !confirmPassword){
            return response.status(400).json({
                message : "Provide required fields email, newPassword, confirmPassword",
                error : true,
                success : false
            })
        }
        const user = await UserModel.findOne({ email });
        if(!user){
            return response.status(400).json({
                message : "Email is not available",
                error : true,
                success : false
            })
        }
        if( newPassword !== confirmPassword){
            return response.status(400).json({
                message : "New Password and Confirm Password does not match",
                error : true,
                success : false
            })
        }

        const salt = await bcryptjs.genSalt(10);
        const hashPassword = await bcryptjs.hash(newPassword,salt);

        const update = await UserModel.findOneAndUpdate(user._id,{
            password : hashPassword
        })
        return response.json({
            message : "Password updated successfully",
            error : false,
            success : true
        })
    }
    catch(error){
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Refresh Token Controller
export async function refreshToken(request,response){
    try{
        const refreshToken = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1];
        if(!refreshToken){
            return response.status(400).json({
                message : "Invalid Token",
                error : true,
                success : false
            })
        }
        console.log("refreshToken", refreshToken);
        const verifyToken = await jwt.verify(refreshToken,process.env.SECRET_KEY_REFRESH_TOKEN);
        if(!verifyToken){
            return response.status(401).json({
                message : "Token is expired",
                error : true,
                success : false
            })
        }

        const userId = verifyToken._id;

        const newAccessToken = await generatedAccessToken(userId);

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        response.cookie('accessToken', newAccessToken,cookiesOption);

        return response.json({
            message : "New Access token generated",
            error : false,
            success : true,
            data : {
                accessToken : newAccessToken
            }
        })

    } 
    catch (error){
        return response.json(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

// Get user login details
export async function userDetails(request,response){
    try{
        const userId = request.userId;


        const user = await UserModel.findById(userId).select('-password -refresh_token');

        return response.json({
            message : 'user details',
            data : user,
            error : false,
            success : true
        })
    }
    catch(error){
        return response.status(500).json({
            message : "Something is wrong",
            error : true,
            success : false
        })
    }
}