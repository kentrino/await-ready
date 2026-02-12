.PHONY: check-mysql
check-mysql:
	docker-compose up mysql -d && \
	bun run dev :33306 --protocol mysql --output sl && \
	docker-compose stop

.PHONY: check-failure
check-failure:
	bun run dev :33 --protocol mysql --output sl
