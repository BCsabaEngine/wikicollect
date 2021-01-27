docker exec -d wikicollect mysql -padmin -e "UPDATE mysql.user SET host='%%' WHERE user='root'; FLUSH PRIVILEGES; "
docker exec -d wikicollect mysql -padmin -e "CREATE DATABASE wikicollect;"
