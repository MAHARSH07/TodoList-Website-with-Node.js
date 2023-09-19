const express = require('express');
const bodyParser = require('body-parser');
const date = require(__dirname + "/date.js");
const mongoose = require('mongoose');
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect('mongodb://127.0.0.1:27017/todolistDB');

const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todoList!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);



var currentDate = date.getDate();
app.get("/", (req, res) => {
  Item.find({}) //Returns an array
    .then((foundItems) => {
      if (foundItems.length === 0) {
        async function insertDefaultItems() {
          try {
            const docs = await Item.insertMany(defaultItems);
            console.log('Successfully saved default items to DB:');

            // Your code to handle the successful insertion here
          } catch (err) {
            console.error('Error inserting items:', err);
          }
        }
        insertDefaultItems();
        res.redirect("/");
      }
      else {
        console.log("Default db length = ", foundItems.length)
        res.render("index.ejs", { listTitle: "Today", existingItems: foundItems });
      }
    })
    .catch((error) => {
      console.error(error);
    });

});


// Using async/await
app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      //Create a new list
      console.log(customListName + " Doesn't exist");

      const list = new List({
        name: customListName,
        items: defaultItems
      });
      console.log("List saved" , list);
      await list.save();
      console.log("List created!");
      res.redirect("/" + customListName);
    } else {
      console.log(customListName + " Exists!");
      res.render('index.ejs', { listTitle: customListName, existingItems: foundList.items })
    }
  } catch (error) {
    console.error('Error:', error);
  }
});




const port = 3000;
// var existingItems = [];
app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list; //Gives the value attribute of the form(Route name we typed)

  const item = new Item({
    name: itemName
  });

  if (listName === 'Today') {
    item.save();
    res.redirect("/");
  }
  else{
    try {
      const foundList = await List.findOne({ name: listName});
  
      if (foundList) {
        //Push the item to a particular array
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      } else {
          console.log("Error");
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }


});



app.post('/delete', (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if(listName === "Today"){
    Item.findOneAndRemove({ _id: checkedItemId })  //We can also use findByIdAndRemove(id, ...) 
    .then((removedItem) => {
      if (removedItem) {
        console.log('Successfully deleted checked item:', removedItem);
        res.redirect("/");
      } else {
        console.log('Item not deleted.');
      }
    })
  }
  else{
     List.findOneAndUpdate({name : listName},{$pull : {items : {_id : checkedItemId}}}) //pulls the item array for a particular route and finds a particular item using its id
      .then((foundItem)=>{
        if(foundItem){
          console.log('Successfully deleted checked item with name:', foundItem.items.find((item)=>item._id.equals(checkedItemId)));
          res.redirect("/"+listName);
        }else {
          console.log('Item not deleted in ',listName);
        }
      })
     
  }

  
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});