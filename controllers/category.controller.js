import CategoryModel from "../models/category.model.js";
import ProductModel from "../models/product.model.js";
import SubCategoryModel from "../models/subCategory.model.js";

// Add Category
export const AddCategoryController = async (request,response)=>{
    try{
        const { name, image } = request.body;
        if(!name || !image){
            return response.status(400).json({
                message : "Enter required fields",
                error : true,
                success : false
            })
        }

        const addCategory = new CategoryModel({
            name,
            image
        })

        const saveCategory = await addCategory.save();

        if(!saveCategory){
            return response.status(400).json({
                message : "Not Created",
                error : true,
                success : false
            })
        }

        return response.json({
            message : "Added Category",
            error : false,
            success : true,
            data : saveCategory
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

// Get Category
export const GetCategoryController = async (request,response)=>{
    try{
        const data = await CategoryModel.find().sort({ createdAt : -1 });

        return response.json({
            data : data,
            error : false,
            success : true
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

// Update Category
export const UpdateCategoryController = async (request,response)=>{
    try{
        const { _id, name, image } = request.body;

        const update = await CategoryModel.updateOne({
            _id : _id
        },{
            name,
            image
        })

        return response.json({
            message : "Updated category successfully",
            error : false,
            success : true,
            data : update
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

// Delete Category
export const DeleteCategorycontroller = async (request,response)=>{
    try{
        const { _id } = request.body;
        const checkSubCategory = await SubCategoryModel.find({
            category : {
                "$in" : [_id]
            }
        }).countDocuments()

        const checkProduct = await ProductModel.find({
            category : {
                "$in" : [_id]
            }
        }).countDocuments()

        if( checkSubCategory > 0 || checkProduct > 0){
            return response.status(400).json({
                message : "Category is already used",
                error : true,
                success : false
            })
        }

        const deleteCategory = await CategoryModel.deleteOne({ _id : _id})

        return response.json({
            message : "Deleted successfully",
            data : deleteCategory,
            error : false,
            success : true
        })
    }
    catch(error){
        return response.status(400).json({
            message : error.message || error,
            error : true,
            success : true
        })
    }
}