Lucas Bradley
6/21/2020
TecAce Interview Assignment

To run this project follow these steps:
1.  To get the node_modules folder run "npm install" if it comes up
    saying there are 4 vulnerabilities then you can run the "npm audit fix"
    command and everything will still work fine. That specific error comes
    from the googleapis which is part of this project.
2.  To run the program run "node index.js"
3.  To test Get /all you can use the web browser by typing
    http://localhost:3000/all or in place of the 3000 you can put
    whatever port the api is listening on
4.  To test Post with a key and value open the Postman program or
    some other method of writing custom POST's
5.  Go into your workspace
6.  Click "New" which is situated around the top left corner of the
    screen
7.  Click "HTTP Request"
8.  As the url put http://localhost:3000/data
9.  To the left of the URL change the method to POST
10. Under the url and in the middle of the options click "Body"
11. In the drop down menu click raw
12. To the right now appears the word "Text" in blue, click on it
    and select JSON
13. In the text box enter:

    {
        key: "someKey",
        value: "someValue"
    }

14. Click send, you can test multiple different key value pairs.
15. To test the Delete with a key follow the same steps 4 - 7
16. As the url put http://localhost:3000/data/someKey where someKey is a
    key which you want to delete from the table
17. Click send, you can test multiple different keys.
18. If you have any questions please email me at lucas@qbradley.com