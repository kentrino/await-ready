.PHONY: check
check:
	docker-compose up mysql -d && \
	bun run dev -p 33306 --protocol mysql --output sl && \
	docker-compose stop
